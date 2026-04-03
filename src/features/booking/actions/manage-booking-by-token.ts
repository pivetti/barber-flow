"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/prisma"
import {
  clearPublicBookingSession,
  createPublicBookingSession,
  getPublicBookingFromSession,
} from "@/lib/public-booking-session"
import { RateLimitExceededError, checkRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"

const CANCELLATION_TOKEN_REGEX = /^ct_[a-f0-9]{32}$/i
const INVALID_TOKEN_DELAY_MS = 250
const GENERIC_MESSAGE = "Nao foi possivel processar sua solicitacao agora"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const normalizeToken = (token: string) => token.trim()

interface CancellationRequestWithoutTokenInput {
  customerName: string
  customerPhone: string
  barberId: string
  date: string
  time: string
}

const applyPublicRateLimit = async () => {
  const ipAddress = await getRequestIp()
  const result = await checkRateLimit(ipAddress, "manage-booking-by-token")

  if (!result.allowed) {
    throw new RateLimitExceededError("manage-booking-by-token", result.retryAfter ?? 60)
  }
}

const mapPublicBooking = (booking: NonNullable<Awaited<ReturnType<typeof getPublicBookingFromSession>>>) => ({
  id: booking.id,
  status: booking.status,
  customerName: booking.customerName,
  customerPhone: booking.customerPhone,
  date: booking.date,
  cancellationRequested: booking.cancellationRequested,
  serviceName: booking.service.name,
  barberName: booking.barber?.name ?? null,
})

const revalidateBookingPaths = () => {
  revalidatePath("/bookings")
  revalidatePath("/bookings/confirmed")
  revalidatePath("/admin/bookings")
  revalidatePath("/admin/dashboard")
}

export const startPublicBookingSessionWithToken = async (token: string) => {
  try {
    await applyPublicRateLimit()
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { ok: false as const, message: GENERIC_MESSAGE, retryAfter: error.retryAfter }
    }

    throw error
  }

  const normalizedToken = normalizeToken(token)
  if (!CANCELLATION_TOKEN_REGEX.test(normalizedToken)) {
    await clearPublicBookingSession()
    await delay(INVALID_TOKEN_DELAY_MS)
    return { ok: false as const, message: GENERIC_MESSAGE }
  }

  const booking = await db.booking.findUnique({
    where: { cancellationToken: normalizedToken },
    select: { id: true },
  })

  if (!booking) {
    await clearPublicBookingSession()
    await delay(INVALID_TOKEN_DELAY_MS)
    return { ok: false as const, message: GENERIC_MESSAGE }
  }

  await createPublicBookingSession(booking.id)
  return { ok: true as const }
}

export const getManagedPublicBooking = async () => {
  try {
    await applyPublicRateLimit()
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return null
    }

    throw error
  }

  const booking = await getPublicBookingFromSession()
  if (!booking) {
    return null
  }

  return mapPublicBooking(booking)
}

export const cancelManagedBooking = async () => {
  try {
    await applyPublicRateLimit()
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { ok: false, message: GENERIC_MESSAGE, retryAfter: error.retryAfter }
    }

    throw error
  }

  const booking = await getPublicBookingFromSession()
  if (!booking) {
    return { ok: false, message: GENERIC_MESSAGE }
  }

  if (booking.status === "CANCELED") {
    return { ok: false, message: "Este agendamento ja foi cancelado" }
  }

  if (booking.status === "DONE" || booking.date < new Date()) {
    return { ok: false, message: "Nao e possivel cancelar um agendamento encerrado" }
  }

  await db.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELED",
      cancellationRequested: false,
      cancellationRequestedAt: null,
    },
  })

  revalidateBookingPaths()
  return { ok: true, message: "Agendamento cancelado com sucesso" }
}

export const requestManagedCancellation = async () => {
  try {
    await applyPublicRateLimit()
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { ok: false, message: GENERIC_MESSAGE, retryAfter: error.retryAfter }
    }

    throw error
  }

  const booking = await getPublicBookingFromSession()
  if (!booking) {
    return { ok: false, message: GENERIC_MESSAGE }
  }

  if (booking.status === "CANCELED") {
    return { ok: false, message: "Este agendamento ja foi cancelado" }
  }

  if (booking.status === "DONE" || booking.date < new Date()) {
    return { ok: false, message: "Este agendamento ja foi encerrado" }
  }

  if (booking.cancellationRequested) {
    return { ok: false, message: "Cancelamento ja solicitado para este agendamento" }
  }

  await db.booking.update({
    where: { id: booking.id },
    data: {
      cancellationRequested: true,
      cancellationRequestedAt: new Date(),
    },
  })

  revalidateBookingPaths()
  return { ok: true, message: "Solicitacao de cancelamento enviada ao barbeiro" }
}

export const requestCancellationWithoutToken = async (
  input: CancellationRequestWithoutTokenInput,
) => {
  void input
  return {
    ok: false,
    message: "Use o link seguro de gerenciamento enviado no comprovante.",
  }
}

export const confirmCancellationWithoutToken = async (
  bookingId: string,
  input: CancellationRequestWithoutTokenInput,
) => {
  void bookingId
  void input
  return {
    ok: false,
    message: "Use o link seguro de gerenciamento enviado no comprovante.",
  }
}

// Compat wrappers (legacy callers)
export const getPublicBookingByToken = async (token: string) => {
  const session = await startPublicBookingSessionWithToken(token)
  if (!session.ok) {
    return null
  }

  return getManagedPublicBooking()
}

export const cancelBookingByToken = async (token?: string) => {
  if (token) {
    const session = await startPublicBookingSessionWithToken(token)
    if (!session.ok) {
      return session
    }
  }

  return cancelManagedBooking()
}

export const requestCancellationByToken = async (token?: string) => {
  if (token) {
    const session = await startPublicBookingSessionWithToken(token)
    if (!session.ok) {
      return session
    }
  }

  return requestManagedCancellation()
}
