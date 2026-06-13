import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaDateParts,
  getBrasiliaDayOfWeek,
  getBrasiliaEndOfDay,
  getBrasiliaStartOfDay,
} from "./brasilia-time"
import { db } from "./prisma"

interface ServiceScheduleConfig {
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
}

interface GetBarberAvailableTimesParams {
  barberId: string
  date: Date
  serviceId?: string
  serviceSchedule?: ServiceScheduleConfig
  existingBookings?: BookingScheduleRange[]
  excludeBookingId?: string
  includeInactiveService?: boolean
}

export interface BookingScheduleRange {
  id?: string
  startsAt: Date
  endsAt: Date
  serviceBufferBeforeMinutes?: number
  serviceBufferAfterMinutes?: number
}

interface BlockedRange {
  startsAt: Date
  endsAt: Date
}

interface OccupiedRange {
  occupiedStart: Date
  occupiedEnd: Date
}

const DEFAULT_SLOT_INTERVAL_MINUTES = 30
const DEFAULT_SERVICE_DURATION_MINUTES = 30
const DEFAULT_BUFFER_MINUTES = 0
const MINUTES_IN_DAY = 24 * 60
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000)

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

export const isValidTimeRange = (startTime: string, endTime: string) => {
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return false
  }

  return timeToMinutes(startTime) < timeToMinutes(endTime)
}

export const intervalsOverlap = (
  candidateStart: Date,
  candidateEnd: Date,
  existingStart: Date,
  existingEnd: Date,
) => candidateStart < existingEnd && candidateEnd > existingStart

export const getOccupiedRange = ({
  startsAt,
  endsAt,
  serviceBufferBeforeMinutes = DEFAULT_BUFFER_MINUTES,
  serviceBufferAfterMinutes = DEFAULT_BUFFER_MINUTES,
}: BookingScheduleRange): OccupiedRange => ({
  occupiedStart: addMinutes(startsAt, -serviceBufferBeforeMinutes),
  occupiedEnd: addMinutes(endsAt, serviceBufferAfterMinutes),
})

export const getServiceOccupiedRange = ({
  startsAt,
  durationMinutes,
  bufferBeforeMinutes,
  bufferAfterMinutes,
}: {
  startsAt: Date
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
}) => {
  const endsAt = addMinutes(startsAt, durationMinutes)

  return {
    startsAt,
    endsAt,
    occupiedStart: addMinutes(startsAt, -bufferBeforeMinutes),
    occupiedEnd: addMinutes(endsAt, bufferAfterMinutes),
  }
}

export const getDateAtBrasiliaMinutes = (date: Date, minutes: number) => {
  const { year, month, day } = getBrasiliaDateParts(date)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return createUtcDateFromBrasiliaParts(year, month, day, hours, remainingMinutes)
}

const normalizeServiceSchedule = ({
  durationMinutes,
  bufferBeforeMinutes,
  bufferAfterMinutes,
}: ServiceScheduleConfig): ServiceScheduleConfig => ({
  durationMinutes:
    durationMinutes > 0 ? durationMinutes : DEFAULT_SERVICE_DURATION_MINUTES,
  bufferBeforeMinutes: Math.max(bufferBeforeMinutes, DEFAULT_BUFFER_MINUTES),
  bufferAfterMinutes: Math.max(bufferAfterMinutes, DEFAULT_BUFFER_MINUTES),
})

const resolveServiceSchedule = async ({
  serviceId,
  serviceSchedule,
  includeInactiveService,
}: Pick<
  GetBarberAvailableTimesParams,
  "serviceId" | "serviceSchedule" | "includeInactiveService"
>) => {
  if (serviceSchedule) {
    return normalizeServiceSchedule(serviceSchedule)
  }

  if (!serviceId) {
    return null
  }

  const service = await db.service.findUnique({
    where: {
      id: serviceId,
    },
    select: {
      durationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
      isActive: true,
    },
  })

  if (!service || (!includeInactiveService && !service.isActive)) {
    return null
  }

  return normalizeServiceSchedule(service)
}

const buildSlotsFromWorkingHours = (
  workingHours: Array<{
    startTime: string
    endTime: string
  }>,
  slotIntervalMinutes: number,
  durationMinutes: number,
) => {
  const slots = new Set<string>()

  for (const workingHour of workingHours) {
    if (!isValidTimeRange(workingHour.startTime, workingHour.endTime)) {
      continue
    }

    const startMinutes = timeToMinutes(workingHour.startTime)
    const endMinutes = timeToMinutes(workingHour.endTime)

    for (
      let currentMinutes = startMinutes;
      currentMinutes + durationMinutes <= endMinutes;
      currentMinutes += slotIntervalMinutes
    ) {
      slots.add(minutesToTime(currentMinutes))
    }
  }

  return Array.from(slots).sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

const bookingOverlapsOccupiedRange = (
  booking: BookingScheduleRange,
  occupiedStart: Date,
  occupiedEnd: Date,
) => {
  const existingOccupiedRange = getOccupiedRange(booking)

  return intervalsOverlap(
    occupiedStart,
    occupiedEnd,
    existingOccupiedRange.occupiedStart,
    existingOccupiedRange.occupiedEnd,
  )
}

const blockedRangeOverlapsOccupiedRange = (
  blockedRange: BlockedRange,
  occupiedStart: Date,
  occupiedEnd: Date,
) => intervalsOverlap(occupiedStart, occupiedEnd, blockedRange.startsAt, blockedRange.endsAt)

export const getBarberAvailableTimesForDate = async ({
  barberId,
  date,
  serviceId,
  serviceSchedule,
  existingBookings,
  excludeBookingId,
  includeInactiveService = false,
}: GetBarberAvailableTimesParams) => {
  const resolvedServiceSchedule = await resolveServiceSchedule({
    serviceId,
    serviceSchedule,
    includeInactiveService,
  })

  if (!resolvedServiceSchedule) {
    return []
  }

  const dayStart = getBrasiliaStartOfDay(date)
  const dayEnd = getBrasiliaEndOfDay(date)
  const dayOfWeek = getBrasiliaDayOfWeek(date)
  const bookingQueryStart = addMinutes(dayStart, -MINUTES_IN_DAY)
  const bookingQueryEnd = addMinutes(dayEnd, MINUTES_IN_DAY)

  const [workingHours, blockedTimes, bookings, settings] = await Promise.all([
    db.workingHour.findMany({
      where: {
        barberId,
        dayOfWeek,
      },
      orderBy: {
        startTime: "asc",
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
    }),
    existingBookings
      ? Promise.resolve(existingBookings)
      : db.booking.findMany({
          where: {
            barberId,
            id: excludeBookingId
              ? {
                  not: excludeBookingId,
                }
              : undefined,
            status: {
              not: "CANCELED",
            },
            startsAt: {
              lt: bookingQueryEnd,
            },
            endsAt: {
              gt: bookingQueryStart,
            },
          },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            serviceBufferBeforeMinutes: true,
            serviceBufferAfterMinutes: true,
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
  ])

  if (workingHours.length === 0) {
    return []
  }

  const slotIntervalMinutes =
    settings?.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES

  const baseSlots = buildSlotsFromWorkingHours(
    workingHours,
    slotIntervalMinutes,
    resolvedServiceSchedule.durationMinutes,
  )

  const blockedRanges: BlockedRange[] = blockedTimes
    .filter((blockedTime) => isValidTimeRange(blockedTime.startTime, blockedTime.endTime))
    .map((blockedTime) => ({
      startsAt: getDateAtBrasiliaMinutes(date, timeToMinutes(blockedTime.startTime)),
      endsAt: getDateAtBrasiliaMinutes(date, timeToMinutes(blockedTime.endTime)),
    }))

  return baseSlots.filter((slot) => {
    const candidateStartsAt = getDateAtBrasiliaMinutes(date, timeToMinutes(slot))
    const { occupiedStart, occupiedEnd } = getServiceOccupiedRange({
      startsAt: candidateStartsAt,
      durationMinutes: resolvedServiceSchedule.durationMinutes,
      bufferBeforeMinutes: resolvedServiceSchedule.bufferBeforeMinutes,
      bufferAfterMinutes: resolvedServiceSchedule.bufferAfterMinutes,
    })

    const overlapsBlockedTime = blockedRanges.some((blockedRange) =>
      blockedRangeOverlapsOccupiedRange(blockedRange, occupiedStart, occupiedEnd),
    )

    if (overlapsBlockedTime) {
      return false
    }

    return !bookings.some((booking) =>
      bookingOverlapsOccupiedRange(booking, occupiedStart, occupiedEnd),
    )
  })
}
