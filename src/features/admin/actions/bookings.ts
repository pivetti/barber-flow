"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { canManageBookings } from "@/lib/admin-permissions"
import {
  addMinutes,
  getBarberAvailableTimesForDate,
} from "@/lib/barber-schedule"
import {
  BOOKING_OVERLAP_ERROR_MESSAGE,
  isBookingOverlapConstraintError,
} from "@/lib/booking-overlap-constraint"
import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaDateParts,
} from "@/lib/brasilia-time"
import {
  adminReturnToSchema,
  customerNameSchema,
  dateInputSchema,
  idSchema,
  phoneSchema,
  sanitizeText,
  timeInputSchema,
} from "@/lib/input-validation"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

const editableBookingFields = ["client", "service", "time", "date"] as const
const editableBookingFieldSchema = z.enum(editableBookingFields)

type EditableBookingSchedule = {
  id: string
  startsAt: Date
  status: "SCHEDULED" | "DONE" | "CANCELED"
  serviceId?: string
  serviceDurationMinutes: number
  serviceBufferBeforeMinutes: number
  serviceBufferAfterMinutes: number
}

interface GetAdminBookingEditDayContextParams {
  bookingId: string
  barberId: string
  serviceId: string
  date: Date
}

interface UpdateAdminBookingWizardParams {
  bookingId: string
  barberId: string
  serviceId: string
  startsAt: Date
  customerName: string
  customerPhone: string
}

const revalidateAdminBookingPaths = (bookingId: string) => {
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(`/admin/bookings/${bookingId}/edit`)
  revalidatePath("/bookings")
}

const parseActionBasePayload = (formData: FormData) => {
  return z
    .object({
      bookingId: idSchema,
      returnTo: adminReturnToSchema,
    })
    .safeParse({
      bookingId: String(formData.get("bookingId") ?? ""),
      returnTo: String(formData.get("returnTo") ?? ""),
    })
}

const parseDatePartsFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  const date = createUtcDateFromBrasiliaParts(year, month, day)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return { year, month, day }
}

const getBrasiliaTimeLabel = (date: Date) => {
  const { hours, minutes } = getBrasiliaDateParts(date)
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const buildStartsAtWithTime = (startsAt: Date, time: string) => {
  const { year, month, day } = getBrasiliaDateParts(startsAt)
  const [hours, minutes] = time.split(":").map(Number)
  return createUtcDateFromBrasiliaParts(year, month, day, hours, minutes)
}

const buildStartsAtWithDate = (startsAt: Date, dateInput: string) => {
  const dateParts = parseDatePartsFromInput(dateInput)
  if (!dateParts) {
    return null
  }

  const { hours, minutes } = getBrasiliaDateParts(startsAt)
  return createUtcDateFromBrasiliaParts(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    hours,
    minutes,
  )
}

const userCanAccessBooking = ({
  adminId,
  bookingId,
}: {
  adminId: string
  bookingId: string
}) => ({
  id: bookingId,
  barberId: adminId,
})

const updateBookingScheduleForAdmin = async ({
  booking,
  adminId,
  data,
}: {
  booking: EditableBookingSchedule
  adminId: string
  data: {
    customerName?: string
    customerPhone?: string
    startsAt?: Date
    serviceId?: string
    serviceName?: string
    servicePrice?: Prisma.Decimal
    serviceDurationMinutes?: number
    serviceBufferBeforeMinutes?: number
    serviceBufferAfterMinutes?: number
  }
}) => {
  const startsAt = data.startsAt ?? booking.startsAt
  const serviceDurationMinutes =
    data.serviceDurationMinutes ?? booking.serviceDurationMinutes
  const serviceBufferBeforeMinutes =
    data.serviceBufferBeforeMinutes ?? booking.serviceBufferBeforeMinutes
  const serviceBufferAfterMinutes =
    data.serviceBufferAfterMinutes ?? booking.serviceBufferAfterMinutes
  const endsAt = addMinutes(startsAt, serviceDurationMinutes)

  if (booking.status !== "CANCELED") {
    const availableTimes = await getBarberAvailableTimesForDate({
      barberId: adminId,
      date: startsAt,
      serviceSchedule: {
        durationMinutes: serviceDurationMinutes,
        bufferBeforeMinutes: serviceBufferBeforeMinutes,
        bufferAfterMinutes: serviceBufferAfterMinutes,
      },
      excludeBookingId: booking.id,
      includeInactiveService: true,
    })

    if (!availableTimes.includes(getBrasiliaTimeLabel(startsAt))) {
      return false
    }
  }

  const result = await db.booking
    .updateMany({
      where: {
        id: booking.id,
        barberId: adminId,
      },
      data: {
        ...data,
        startsAt,
        endsAt,
        serviceDurationMinutes,
        serviceBufferBeforeMinutes,
        serviceBufferAfterMinutes,
      },
    })
    .catch((error: unknown) => {
      if (isBookingOverlapConstraintError(error)) {
        throw new Error(BOOKING_OVERLAP_ERROR_MESSAGE)
      }

      throw error
    })

  return result.count === 1
}

const updateBookingStatusForAdmin = async ({
  bookingId,
  adminId,
  status,
}: {
  bookingId: string
  adminId: string
  status: "CANCELED" | "DONE"
}) => {
  return db.booking.updateMany({
    where: {
      id: bookingId,
      barberId: adminId,
    },
    data: {
      status,
      cancellationRequested: false,
      cancellationRequestedAt: null,
    },
  })
}

const deleteBookingForAdmin = async ({
  bookingId,
  adminId,
}: {
  bookingId: string
  adminId: string
}) => {
  return db.booking.deleteMany({
    where: {
      id: bookingId,
      barberId: adminId,
    },
  })
}

export const cancelAdminBooking = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsed = parseActionBasePayload(formData)
  if (!parsed.success) {
    return
  }

  const result = await updateBookingStatusForAdmin({
    bookingId: parsed.data.bookingId,
    adminId: admin.id,
    status: "CANCELED",
  })

  if (result.count !== 1) {
    return
  }

  revalidateAdminBookingPaths(parsed.data.bookingId)

  if (parsed.data.returnTo) {
    redirect(parsed.data.returnTo)
  }
}

export const concludeAdminBooking = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsed = parseActionBasePayload(formData)
  if (!parsed.success) {
    return
  }

  const result = await updateBookingStatusForAdmin({
    bookingId: parsed.data.bookingId,
    adminId: admin.id,
    status: "DONE",
  })

  if (result.count !== 1) {
    return
  }

  revalidateAdminBookingPaths(parsed.data.bookingId)

  if (parsed.data.returnTo) {
    redirect(parsed.data.returnTo)
  }
}

export const deleteAdminBooking = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsed = parseActionBasePayload(formData)
  if (!parsed.success) {
    return
  }

  const result = await deleteBookingForAdmin({
    bookingId: parsed.data.bookingId,
    adminId: admin.id,
  })

  if (result.count !== 1) {
    return
  }

  revalidateAdminBookingPaths(parsed.data.bookingId)

  if (parsed.data.returnTo) {
    redirect(parsed.data.returnTo)
  }
}

export const cancelAdminBookingInline = async (bookingId: string) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsedBookingId = idSchema.safeParse(bookingId)
  if (!parsedBookingId.success) {
    return { ok: false as const }
  }

  const result = await updateBookingStatusForAdmin({
    bookingId: parsedBookingId.data,
    adminId: admin.id,
    status: "CANCELED",
  })

  if (result.count !== 1) {
    return { ok: false as const }
  }

  revalidateAdminBookingPaths(parsedBookingId.data)
  return { ok: true as const }
}

export const concludeAdminBookingInline = async (bookingId: string) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsedBookingId = idSchema.safeParse(bookingId)
  if (!parsedBookingId.success) {
    return { ok: false as const }
  }

  const result = await updateBookingStatusForAdmin({
    bookingId: parsedBookingId.data,
    adminId: admin.id,
    status: "DONE",
  })

  if (result.count !== 1) {
    return { ok: false as const }
  }

  revalidateAdminBookingPaths(parsedBookingId.data)
  return { ok: true as const }
}

export const deleteAdminBookingInline = async (bookingId: string) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsedBookingId = idSchema.safeParse(bookingId)
  if (!parsedBookingId.success) {
    return { ok: false as const }
  }

  const result = await deleteBookingForAdmin({
    bookingId: parsedBookingId.data,
    adminId: admin.id,
  })

  if (result.count !== 1) {
    return { ok: false as const }
  }

  revalidateAdminBookingPaths(parsedBookingId.data)
  return { ok: true as const }
}

export const getAdminBookingEditDayContext = async ({
  bookingId,
  barberId,
  serviceId,
  date,
}: GetAdminBookingEditDayContextParams) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsed = z
    .object({
      bookingId: idSchema,
      barberId: idSchema,
      serviceId: idSchema,
      date: z.date(),
    })
    .safeParse({
      bookingId,
      barberId,
      serviceId,
      date,
    })

  if (!parsed.success || parsed.data.barberId !== admin.id) {
    return {
      availableTimes: [],
    }
  }

  const [booking, service] = await Promise.all([
    db.booking.findFirst({
      where: userCanAccessBooking({
        adminId: admin.id,
        bookingId: parsed.data.bookingId,
      }),
      select: {
        id: true,
      },
    }),
    db.service.findUnique({
      where: {
        id: parsed.data.serviceId,
      },
      select: {
        id: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    }),
  ])

  if (!booking || !service) {
    return {
      availableTimes: [],
    }
  }

  const availableTimes = await getBarberAvailableTimesForDate({
    barberId: parsed.data.barberId,
    date: parsed.data.date,
    serviceSchedule: {
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    },
    excludeBookingId: parsed.data.bookingId,
    includeInactiveService: true,
  })

  return {
    availableTimes,
  }
}

export const updateAdminBookingWizard = async ({
  bookingId,
  barberId,
  serviceId,
  startsAt,
  customerName,
  customerPhone,
}: UpdateAdminBookingWizardParams) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsed = z
    .object({
      bookingId: idSchema,
      barberId: idSchema,
      serviceId: idSchema,
      startsAt: z.date(),
      customerName: customerNameSchema,
      customerPhone: phoneSchema,
    })
    .safeParse({
      bookingId,
      barberId,
      serviceId,
      startsAt,
      customerName,
      customerPhone,
    })

  if (!parsed.success || parsed.data.barberId !== admin.id) {
    return {
      ok: false as const,
      message: "Dados de agendamento invalidos.",
    }
  }

  const [booking, service] = await Promise.all([
    db.booking.findFirst({
      where: userCanAccessBooking({
        adminId: admin.id,
        bookingId: parsed.data.bookingId,
      }),
      select: {
        id: true,
        startsAt: true,
        serviceId: true,
        status: true,
        serviceDurationMinutes: true,
        serviceBufferBeforeMinutes: true,
        serviceBufferAfterMinutes: true,
      },
    }),
    db.service.findUnique({
      where: {
        id: parsed.data.serviceId,
      },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    }),
  ])

  if (!booking || !service) {
    return {
      ok: false as const,
      message: "Nao foi possivel localizar este agendamento.",
    }
  }

  const scheduleChanged =
    booking.serviceId !== service.id ||
    booking.startsAt.getTime() !== parsed.data.startsAt.getTime()

  const scheduleUpdated = scheduleChanged
    ? await updateBookingScheduleForAdmin({
        booking,
        adminId: admin.id,
        data: {
          startsAt: parsed.data.startsAt,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone,
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: service.price,
          serviceDurationMinutes: service.durationMinutes,
          serviceBufferBeforeMinutes: service.bufferBeforeMinutes,
          serviceBufferAfterMinutes: service.bufferAfterMinutes,
        },
      })
    : (
        await db.booking.updateMany({
          where: userCanAccessBooking({
            adminId: admin.id,
            bookingId: parsed.data.bookingId,
          }),
          data: {
            customerName: parsed.data.customerName,
            customerPhone: parsed.data.customerPhone,
          },
        })
      ).count === 1

  if (!scheduleUpdated) {
    return {
      ok: false as const,
      message: "Este horario esta indisponivel. Escolha outro.",
    }
  }

  revalidateAdminBookingPaths(parsed.data.bookingId)

  return {
    ok: true as const,
  }
}

export const updateAdminBookingField = async (formData: FormData) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  const parsedHeader = z
    .object({
      bookingId: idSchema,
      field: editableBookingFieldSchema,
    })
    .safeParse({
      bookingId: String(formData.get("bookingId") ?? ""),
      field: sanitizeText(String(formData.get("field") ?? "")),
    })

  if (!parsedHeader.success) {
    return
  }

  const booking = await db.booking.findFirst({
    where: {
      id: parsedHeader.data.bookingId,
      barberId: admin.id,
    },
    select: {
      id: true,
      startsAt: true,
      status: true,
      serviceDurationMinutes: true,
      serviceBufferBeforeMinutes: true,
      serviceBufferAfterMinutes: true,
    },
  })

  if (!booking) {
    return
  }

  if (parsedHeader.data.field === "client") {
    const parsedClient = z
      .object({
        customerName: customerNameSchema,
        customerPhone: phoneSchema,
      })
      .safeParse({
        customerName: String(formData.get("customerName") ?? ""),
        customerPhone: String(formData.get("customerPhone") ?? ""),
      })

    if (!parsedClient.success) {
      return
    }

    const result = await db.booking.updateMany({
      where: {
        id: parsedHeader.data.bookingId,
        barberId: admin.id,
      },
      data: {
        customerName: parsedClient.data.customerName,
        customerPhone: parsedClient.data.customerPhone,
      },
    })

    if (result.count !== 1) {
      return
    }
  }

  if (parsedHeader.data.field === "service") {
    const parsedServiceId = idSchema.safeParse(String(formData.get("serviceId") ?? ""))
    if (!parsedServiceId.success) {
      return
    }

    const service = await db.service.findUnique({
      where: {
        id: parsedServiceId.data,
      },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    })

    if (!service) {
      return
    }

    const updated = await updateBookingScheduleForAdmin({
      booking,
      adminId: admin.id,
      data: {
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDurationMinutes: service.durationMinutes,
        serviceBufferBeforeMinutes: service.bufferBeforeMinutes,
        serviceBufferAfterMinutes: service.bufferAfterMinutes,
      },
    })

    if (!updated) {
      return
    }
  }

  if (parsedHeader.data.field === "time") {
    const parsedTime = timeInputSchema.safeParse(String(formData.get("time") ?? ""))
    if (!parsedTime.success) {
      return
    }

    const nextStartsAt = buildStartsAtWithTime(booking.startsAt, parsedTime.data)

    const updated = await updateBookingScheduleForAdmin({
      booking,
      adminId: admin.id,
      data: {
        startsAt: nextStartsAt,
      },
    })

    if (!updated) {
      return
    }
  }

  if (parsedHeader.data.field === "date") {
    const parsedDate = dateInputSchema.safeParse(String(formData.get("date") ?? ""))
    if (!parsedDate.success) {
      return
    }

    const nextStartsAt = buildStartsAtWithDate(booking.startsAt, parsedDate.data)
    if (!nextStartsAt) {
      return
    }

    const updated = await updateBookingScheduleForAdmin({
      booking,
      adminId: admin.id,
      data: {
        startsAt: nextStartsAt,
      },
    })

    if (!updated) {
      return
    }
  }

  revalidateAdminBookingPaths(parsedHeader.data.bookingId)
  redirect(`/admin/bookings/${parsedHeader.data.bookingId}`)
}
