"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canManageSchedule } from "@/lib/admin-permissions"
import {
  dateInputSchema,
  idSchema,
  shortReasonSchema,
  timeInputSchema,
} from "@/lib/input-validation"
import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaDateParts,
} from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const validSlotIntervals = new Set([10, 15, 20, 30])
const slotIntervalSchema = z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)])
const dayOfWeekSchema = z.number().int().min(0).max(6)

export interface BlockedTimeBookingConflict {
  id: string
  startsAt: string
  endsAt: string
  customerName: string
  customerPhone: string
  serviceName: string
  barberName: string
  status: string
}

export type CreateBlockedTimeResult =
  | {
      ok: true
    }
  | {
      ok: false
      reason: "VALIDATION_ERROR"
      message: string
    }
  | {
      ok: false
      reason: "BOOKING_CONFLICT"
      blockedStart: string
      blockedEnd: string
      conflicts: BlockedTimeBookingConflict[]
    }

const normalizeTime = (value: string) => value.trim().slice(0, 5)

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const parseBrasiliaDatePartsFromInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error("Invalid date")
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = createUtcDateFromBrasiliaParts(year, month, day)
  const parts = getBrasiliaDateParts(date)

  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    throw new Error("Invalid date")
  }

  return {
    year,
    month,
    day,
    date,
  }
}

const parseTimeRange = (start: string, end: string) => {
  const startTime = normalizeTime(start)
  const endTime = normalizeTime(end)

  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new Error("Invalid time")
  }

  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    throw new Error("Start time must be lower than end time")
  }

  return {
    startTime,
    endTime,
  }
}

const createBrasiliaDateTime = ({
  dateParts,
  time,
}: {
  dateParts: ReturnType<typeof parseBrasiliaDatePartsFromInput>
  time: string
}) => {
  const [hours, minutes] = time.split(":").map(Number)
  return createUtcDateFromBrasiliaParts(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    hours,
    minutes,
  )
}

const revalidateSchedulePages = () => {
  revalidatePath("/admin/schedule")
  revalidatePath("/")
}

export const updateSlotInterval = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    throw new Error("Not authorized to manage schedule")
  }

  const parsedSlot = slotIntervalSchema.safeParse(Number(formData.get("slotIntervalMinutes")))
  if (!parsedSlot.success || !validSlotIntervals.has(parsedSlot.data)) {
    throw new Error("Invalid slot interval")
  }

  await db.scheduleSettings.upsert({
    where: {
      barberId: admin.id,
    },
    create: {
      barberId: admin.id,
      slotIntervalMinutes: parsedSlot.data,
    },
    update: {
      slotIntervalMinutes: parsedSlot.data,
    },
  })

  revalidateSchedulePages()
}

export const addWorkingHour = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    throw new Error("Not authorized to manage schedule")
  }

  const parsedDay = dayOfWeekSchema.safeParse(Number(formData.get("dayOfWeek")))
  if (!parsedDay.success) {
    throw new Error("Invalid day of week")
  }

  const parsedTimes = z
    .object({
      startTime: timeInputSchema,
      endTime: timeInputSchema,
    })
    .safeParse({
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
    })

  if (!parsedTimes.success) {
    throw new Error("Invalid working hour")
  }

  const { startTime, endTime } = parseTimeRange(parsedTimes.data.startTime, parsedTimes.data.endTime)

  await db.workingHour.upsert({
    where: {
      barberId_dayOfWeek_startTime_endTime: {
        barberId: admin.id,
        dayOfWeek: parsedDay.data,
        startTime,
        endTime,
      },
    },
    create: {
      barberId: admin.id,
      dayOfWeek: parsedDay.data,
      startTime,
      endTime,
    },
    update: {
      startTime,
      endTime,
    },
  })

  revalidateSchedulePages()
}

export const deleteWorkingHour = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    throw new Error("Not authorized to manage schedule")
  }

  const parsedWorkingHourId = idSchema.safeParse(String(formData.get("workingHourId") ?? ""))
  if (!parsedWorkingHourId.success) {
    return
  }

  await db.workingHour.deleteMany({
    where: {
      id: parsedWorkingHourId.data,
      barberId: admin.id,
    },
  })

  revalidateSchedulePages()
}

export const createBlockedTime = async (
  formData: FormData,
): Promise<CreateBlockedTimeResult> => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    throw new Error("Not authorized to manage schedule")
  }

  const parsedPayload = z
    .object({
      date: dateInputSchema,
      reason: shortReasonSchema,
      startTime: timeInputSchema,
      endTime: timeInputSchema,
    })
    .safeParse({
      date: String(formData.get("date") ?? "").trim(),
      reason: String(formData.get("reason") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
    })

  if (!parsedPayload.success) {
    return {
      ok: false,
      reason: "VALIDATION_ERROR",
      message: "Preencha data, inicio e fim do bloqueio corretamente.",
    }
  }

  let dateParts: ReturnType<typeof parseBrasiliaDatePartsFromInput>
  let timeRange: ReturnType<typeof parseTimeRange>

  try {
    dateParts = parseBrasiliaDatePartsFromInput(parsedPayload.data.date)
    timeRange = parseTimeRange(
      parsedPayload.data.startTime,
      parsedPayload.data.endTime,
    )
  } catch {
    return {
      ok: false,
      reason: "VALIDATION_ERROR",
      message: "O periodo do bloqueio precisa ter uma data valida e fim maior que o inicio.",
    }
  }

  const { startTime, endTime } = timeRange

  const blockedStart = createBrasiliaDateTime({
    dateParts,
    time: startTime,
  })
  const blockedEnd = createBrasiliaDateTime({
    dateParts,
    time: endTime,
  })

  const conflicts = await db.booking.findMany({
    where: {
      barberId: admin.id,
      status: "SCHEDULED",
      startsAt: {
        lt: blockedEnd,
      },
      endsAt: {
        gt: blockedStart,
      },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      customerName: true,
      customerPhone: true,
      serviceName: true,
      status: true,
      barber: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
  })

  if (conflicts.length > 0) {
    return {
      ok: false,
      reason: "BOOKING_CONFLICT",
      blockedStart: blockedStart.toISOString(),
      blockedEnd: blockedEnd.toISOString(),
      conflicts: conflicts.map((booking) => ({
        id: booking.id,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        serviceName: booking.serviceName,
        barberName: booking.barber.name,
        status: booking.status,
      })),
    }
  }

  await db.blockedTime.create({
    data: {
      barberId: admin.id,
      date: dateParts.date,
      startTime,
      endTime,
      reason: parsedPayload.data.reason || null,
    },
  })

  revalidateSchedulePages()
  return { ok: true }
}

export const deleteBlockedTime = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    throw new Error("Not authorized to manage schedule")
  }

  const parsedBlockedTimeId = idSchema.safeParse(String(formData.get("blockedTimeId") ?? ""))
  if (!parsedBlockedTimeId.success) {
    return
  }

  await db.blockedTime.deleteMany({
    where: {
      id: parsedBlockedTimeId.data,
      barberId: admin.id,
    },
  })

  revalidateSchedulePages()
}
