"use server"

import { randomBytes } from "crypto"
import { format, addWeeks } from "date-fns"
import { z } from "zod"
import {
  getBrasiliaDayOfWeek,
  getBrasiliaEndOfDay,
  getBrasiliaTodayStart,
  isSameBrasiliaDay,
  toBrasiliaWallClock,
} from "@/lib/brasilia-time"
import {
  addMinutes,
  getBarberAvailableTimesForDate,
  getOccupiedRange,
  getServiceOccupiedRange,
  intervalsOverlap,
} from "@/lib/barber-schedule"
import { customerNameSchema, idSchema, phoneSchema } from "@/lib/input-validation"
import {
  BOOKING_OVERLAP_ERROR_MESSAGE,
  isBookingOverlapConstraintError,
} from "@/lib/booking-overlap-constraint"
import { db } from "@/lib/prisma"
import { createPublicBookingSession } from "@/lib/public-booking-session"
import { enforceRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"

interface CreateBookingParams {
  serviceId: string
  barberId: string
  date: Date
  customerName: string
  customerPhone: string
}

const BOOKING_CONFLICT_QUERY_PADDING_MINUTES = 24 * 60

const getEasterDate = (year: number) => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getBrazilNationalHolidays = (year: number) => {
  const easter = getEasterDate(year)
  return [
    new Date(year, 0, 1),
    new Date(year, 3, 21),
    new Date(year, 4, 1),
    new Date(year, 8, 7),
    new Date(year, 9, 12),
    new Date(year, 10, 2),
    new Date(year, 10, 15),
    new Date(year, 11, 25),
    addDays(easter, -48),
    addDays(easter, -47),
    addDays(easter, -2),
    addDays(easter, 60),
  ]
}

const isSundayOrBrazilHoliday = (date: Date) => {
  if (getBrasiliaDayOfWeek(date) === 0) {
    return true
  }

  return getBrazilNationalHolidays(date.getFullYear()).some((holiday) =>
    isSameBrasiliaDay(holiday, date),
  )
}

export const createBooking = async (params: CreateBookingParams) => {
  const ipAddress = await getRequestIp()
  await enforceRateLimit(ipAddress, "create-booking")

  const parsed = z
    .object({
      serviceId: idSchema,
      barberId: idSchema,
      date: z.date(),
      customerName: customerNameSchema,
      customerPhone: phoneSchema,
    })
    .safeParse(params)

  if (!parsed.success) {
    throw new Error("Dados de agendamento invalidos")
  }

  const { serviceId, barberId, date, customerName, customerPhone } = parsed.data
  const selectedTime = format(toBrasiliaWallClock(date), "HH:mm")

  const todayStart = getBrasiliaTodayStart()
  const maxBookingDate = getBrasiliaEndOfDay(addWeeks(todayStart, 4))

  if (date < todayStart) {
    throw new Error("Nao e possivel agendar em datas passadas")
  }

  if (date > maxBookingDate) {
    throw new Error("Voce so pode agendar ate 4 semanas a partir de hoje")
  }

  if (isSundayOrBrazilHoliday(date)) {
    throw new Error("Nao e possivel agendar aos domingos e feriados nacionais")
  }

  const [service, barber] = await Promise.all([
    db.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        isActive: true,
      },
    }),
    db.barber.findUnique({
      where: { id: barberId },
      select: { id: true, isActive: true },
    }),
  ])

  if (!service || !service.isActive) {
    throw new Error("Servico invalido")
  }

  if (!barber || !barber.isActive) {
    throw new Error("Barbeiro indisponivel")
  }

  const serviceSchedule = {
    durationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
  }
  const availableTimes = await getBarberAvailableTimesForDate({
    barberId,
    date,
    serviceSchedule,
  })

  if (!availableTimes.includes(selectedTime)) {
    throw new Error("Este horario esta indisponivel. Escolha outro.")
  }

  const { startsAt, endsAt, occupiedStart, occupiedEnd } = getServiceOccupiedRange({
    startsAt: date,
    durationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
  })
  const possibleConflictingBookings = await db.booking.findMany({
    where: {
      barberId,
      status: {
        not: "CANCELED",
      },
      startsAt: {
        lt: addMinutes(occupiedEnd, BOOKING_CONFLICT_QUERY_PADDING_MINUTES),
      },
      endsAt: {
        gt: addMinutes(occupiedStart, -BOOKING_CONFLICT_QUERY_PADDING_MINUTES),
      },
    },
    select: {
      startsAt: true,
      endsAt: true,
      serviceBufferBeforeMinutes: true,
      serviceBufferAfterMinutes: true,
    },
  })
  const conflictingBooking = possibleConflictingBookings.some((booking) => {
    const existingOccupiedRange = getOccupiedRange(booking)

    return intervalsOverlap(
      occupiedStart,
      occupiedEnd,
      existingOccupiedRange.occupiedStart,
      existingOccupiedRange.occupiedEnd,
    )
  })

  if (conflictingBooking) {
    throw new Error("Este horario ja esta agendado. Escolha outro.")
  }

  const booking = await db.booking
    .create({
      data: {
        serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDurationMinutes: service.durationMinutes,
        serviceBufferBeforeMinutes: service.bufferBeforeMinutes,
        serviceBufferAfterMinutes: service.bufferAfterMinutes,
        barberId,
        startsAt,
        endsAt,
        customerName,
        customerPhone,
        cancellationToken: `ct_${randomBytes(16).toString("hex")}`,
      },
      select: {
        id: true,
      },
    })
    .catch((error: unknown) => {
      if (isBookingOverlapConstraintError(error)) {
        throw new Error(BOOKING_OVERLAP_ERROR_MESSAGE)
      }

      throw error
    })

  await createPublicBookingSession(booking.id)

  return booking
}
