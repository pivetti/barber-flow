import "server-only"
import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"
import { db } from "./prisma"
import { getAppEnv } from "./env"

export const PUBLIC_BOOKING_SESSION_COOKIE_NAME = "public_booking_session"
const PUBLIC_BOOKING_SESSION_TTL_SECONDS = 60 * 15

interface PublicBookingSessionPayload extends JwtPayload {
  sub: string
  scope: "public-booking-management"
}

const getJwtSecret = () => getAppEnv().JWT_SECRET

const signPublicBookingSessionToken = (bookingId: string) => {
  return jwt.sign(
    {
      sub: bookingId,
      scope: "public-booking-management",
    } satisfies PublicBookingSessionPayload,
    getJwtSecret(),
    {
      expiresIn: PUBLIC_BOOKING_SESSION_TTL_SECONDS,
    },
  )
}

const verifyPublicBookingSessionToken = (token: string): PublicBookingSessionPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    if (typeof decoded === "string") {
      return null
    }

    if (!decoded.sub || decoded.scope !== "public-booking-management") {
      return null
    }

    return decoded as PublicBookingSessionPayload
  } catch {
    return null
  }
}

const publicBookingSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/bookings",
  maxAge: PUBLIC_BOOKING_SESSION_TTL_SECONDS,
}

export const createPublicBookingSession = async (bookingId: string) => {
  const cookieStore = await cookies()
  const token = signPublicBookingSessionToken(bookingId)
  cookieStore.set(PUBLIC_BOOKING_SESSION_COOKIE_NAME, token, publicBookingSessionCookieOptions)
}

export const clearPublicBookingSession = async () => {
  const cookieStore = await cookies()
  cookieStore.set(PUBLIC_BOOKING_SESSION_COOKIE_NAME, "", {
    ...publicBookingSessionCookieOptions,
    maxAge: 0,
  })
}

export const getPublicBookingIdFromSession = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(PUBLIC_BOOKING_SESSION_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const payload = verifyPublicBookingSessionToken(token)
  if (!payload?.sub) {
    return null
  }

  return payload.sub
}

export const getPublicBookingFromSession = async () => {
  const bookingId = await getPublicBookingIdFromSession()
  if (!bookingId) {
    return null
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      barber: true,
    },
  })

  return booking
}
