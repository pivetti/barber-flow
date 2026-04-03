import { format } from "date-fns"
import {
  getBrasiliaDayOfWeek,
  getBrasiliaEndOfDay,
  getBrasiliaStartOfDay,
  toBrasiliaWallClock,
} from "./brasilia-time"
import { db } from "./prisma"

interface GetBarberAvailableTimesParams {
  barberId: string
  date: Date
  existingBookings?: Array<{ date: Date }>
}

interface BlockedRangeMinutes {
  startMinutes: number
  endMinutes: number
}

const DEFAULT_SLOT_INTERVAL_MINUTES = 30

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

const isValidTimeRange = (startTime: string, endTime: string) => {
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return false
  }

  return timeToMinutes(startTime) < timeToMinutes(endTime)
}

const buildSlotsFromWorkingHours = (
  workingHours: Array<{
    startTime: string
    endTime: string
  }>,
  slotIntervalMinutes: number,
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
      currentMinutes + slotIntervalMinutes <= endMinutes;
      currentMinutes += slotIntervalMinutes
    ) {
      slots.add(minutesToTime(currentMinutes))
    }
  }

  return Array.from(slots).sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
}

export const getBarberAvailableTimesForDate = async ({
  barberId,
  date,
  existingBookings,
}: GetBarberAvailableTimesParams) => {
  const dayStart = getBrasiliaStartOfDay(date)
  const dayEnd = getBrasiliaEndOfDay(date)
  const dayOfWeek = getBrasiliaDayOfWeek(date)

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
            status: {
              not: "CANCELED",
            },
            date: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          select: {
            date: true,
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

  const slotIntervalMinutes = settings?.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES

  const baseSlots = buildSlotsFromWorkingHours(workingHours, slotIntervalMinutes)

  const blockedRanges: BlockedRangeMinutes[] = blockedTimes
    .filter((blockedTime) => isValidTimeRange(blockedTime.startTime, blockedTime.endTime))
    .map((blockedTime) => ({
      startMinutes: timeToMinutes(blockedTime.startTime),
      endMinutes: timeToMinutes(blockedTime.endTime),
    }))

  const bookedTimes = new Set(bookings.map((booking) => format(toBrasiliaWallClock(booking.date), "HH:mm")))

  return baseSlots.filter((slot) => {
    const slotMinutes = timeToMinutes(slot)

    const isBlocked = blockedRanges.some(
      (blockedRange: BlockedRangeMinutes) =>
        slotMinutes >= blockedRange.startMinutes && slotMinutes < blockedRange.endMinutes,
    )

    if (isBlocked) {
      return false
    }

    return !bookedTimes.has(slot)
  })
}
