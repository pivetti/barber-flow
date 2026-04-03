"use server"

import { randomBytes } from "crypto"
import { format, addWeeks } from "date-fns"
import { z } from "zod"
import {
  getBrasiliaDayOfWeek,
  getBrasiliaEndOfDay,
  getBrasiliaStartOfDay,
  getBrasiliaTodayStart,
  isSameBrasiliaDay,
  toBrasiliaWallClock,
} from "@/lib/brasilia-time"
import { customerNameSchema, idSchema, phoneSchema } from "@/lib/input-validation"
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

const DEFAULT_SLOT_INTERVAL_MINUTES = 30
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

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

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const isValidTimeRange = (startTime: string, endTime: string) => {
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return false
  }

  return timeToMinutes(startTime) < timeToMinutes(endTime)
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
  const selectedMinutes = timeToMinutes(selectedTime)

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

  const dayStart = getBrasiliaStartOfDay(date)
  const dayEnd = getBrasiliaEndOfDay(date)
  const dayOfWeek = getBrasiliaDayOfWeek(date)

  const [service, barber, workingHours, blockedTimes, settings, conflictingBooking] = await Promise.all([
    db.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    }),
    db.barber.findUnique({
      where: { id: barberId },
      select: { id: true, isActive: true },
    }),
    db.workingHour.findMany({
      where: {
        barberId,
        dayOfWeek,
      },
      orderBy: {
        startTime: "asc",
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
    db.blockedTime.findMany({
      where: {
        barberId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        startTime: "asc",
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
    db.scheduleSettings.findUnique({
      where: {
        barberId,
      },
      select: {
        slotIntervalMinutes: true,
      },
    }),
    db.booking.findFirst({
      where: {
        barberId,
        date,
        status: {
          not: "CANCELED",
        },
      },
      select: {
        id: true,
      },
    }),
  ])

  if (!service) {
    throw new Error("Servico invalido")
  }

  if (!barber || !barber.isActive) {
    throw new Error("Barbeiro indisponivel")
  }

  const slotIntervalMinutes = settings?.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES

  const isWithinWorkingHours = workingHours.some((workingHour) => {
    if (!isValidTimeRange(workingHour.startTime, workingHour.endTime)) {
      return false
    }

    const startMinutes = timeToMinutes(workingHour.startTime)
    const endMinutes = timeToMinutes(workingHour.endTime)

    return (
      selectedMinutes >= startMinutes &&
      selectedMinutes + slotIntervalMinutes <= endMinutes &&
      (selectedMinutes - startMinutes) % slotIntervalMinutes === 0
    )
  })

  if (!isWithinWorkingHours) {
    throw new Error("Este horario esta indisponivel. Escolha outro.")
  }

  const isBlocked = blockedTimes.some((blockedTime) => {
    if (!isValidTimeRange(blockedTime.startTime, blockedTime.endTime)) {
      return false
    }

    const startMinutes = timeToMinutes(blockedTime.startTime)
    const endMinutes = timeToMinutes(blockedTime.endTime)

    return selectedMinutes >= startMinutes && selectedMinutes < endMinutes
  })

  if (isBlocked) {
    throw new Error("Este horario esta indisponivel. Escolha outro.")
  }

  if (conflictingBooking) {
    throw new Error("Este horario ja esta agendado. Escolha outro.")
  }

  const booking = await db.booking.create({
    data: {
      serviceId,
      barberId,
      date,
      customerName,
      customerPhone,
      cancellationToken: `ct_${randomBytes(16).toString("hex")}`,
    },
    select: {
      id: true,
    },
  })

  await createPublicBookingSession(booking.id)

  return booking
}
