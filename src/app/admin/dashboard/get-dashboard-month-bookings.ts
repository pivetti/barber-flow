import { format } from "date-fns"
import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaDateParts,
  getBrasiliaTodayStart,
  toBrasiliaWallClock,
} from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"

export interface DashboardMonthBooking {
  id: string
  dateKey: string
  time: string
  endTime: string
  startsAtIso: string
  endsAtIso: string
  status: string
  cancellationRequested: boolean
  customerName: string
  customerPhone: string
  serviceName: string
}

const parseDateKey = (dateKey?: string) => {
  const match = dateKey?.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return getBrasiliaTodayStart()
  }

  return createUtcDateFromBrasiliaParts(Number(match[1]), Number(match[2]), Number(match[3]))
}

const getMonthRange = (dateKey: string) => {
  const date = parseDateKey(dateKey)
  const { year, month } = getBrasiliaDateParts(date)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthYear = month === 12 ? year + 1 : year

  return {
    start: createUtcDateFromBrasiliaParts(year, month, 1),
    end: createUtcDateFromBrasiliaParts(nextMonthYear, nextMonth, 1),
  }
}

export const getDashboardMonthBookings = async ({
  barberId,
  dateKey,
}: {
  barberId: string
  dateKey: string
}): Promise<DashboardMonthBooking[]> => {
  const range = getMonthRange(dateKey)

  const bookings = await db.booking.findMany({
    where: {
      barberId,
      status: {
        not: "CANCELED",
      },
      startsAt: {
        gte: range.start,
        lt: range.end,
      },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      cancellationRequested: true,
      customerName: true,
      customerPhone: true,
      serviceName: true,
    },
    orderBy: {
      startsAt: "asc",
    },
  })

  return bookings.map((booking) => {
    const wallClockStart = toBrasiliaWallClock(booking.startsAt)
    const wallClockEnd = toBrasiliaWallClock(booking.endsAt)

    return {
      id: booking.id,
      dateKey: format(wallClockStart, "yyyy-MM-dd"),
      time: format(wallClockStart, "HH:mm"),
      endTime: format(wallClockEnd, "HH:mm"),
      startsAtIso: booking.startsAt.toISOString(),
      endsAtIso: booking.endsAt.toISOString(),
      status: booking.status,
      cancellationRequested: booking.cancellationRequested,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      serviceName: booking.serviceName,
    }
  })
}
