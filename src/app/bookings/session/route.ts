import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/prisma"
import {
  clearPublicBookingSession,
  createPublicBookingSession,
} from "@/lib/public-booking-session"
import { checkRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"
import { resolveSafePath } from "@/lib/safe-redirect"

const CANCELLATION_TOKEN_REGEX = /^ct_[a-f0-9]{32}$/i

export async function GET(request: NextRequest) {
  const ipAddress = await getRequestIp()
  const rateLimit = await checkRateLimit(ipAddress, "manage-booking-by-token")
  if (!rateLimit.allowed) {
    console.warn(
      `[rate-limit-blocked] route=bookings-session ip=${ipAddress} retryAfter=${rateLimit.retryAfter ?? 60}s`,
    )
    return NextResponse.json(
      { error: "too many requests, try again later" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter ?? 60),
        },
      },
    )
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? ""
  const nextPath = resolveSafePath(request.nextUrl.searchParams.get("next") ?? undefined, {
    fallback: "/bookings",
    requiredPrefix: "/bookings",
  })

  if (!CANCELLATION_TOKEN_REGEX.test(token)) {
    await clearPublicBookingSession()
    return NextResponse.redirect(new URL(nextPath, request.url))
  }

  const booking = await db.booking.findUnique({
    where: {
      cancellationToken: token,
    },
    select: {
      id: true,
    },
  })

  if (!booking) {
    await clearPublicBookingSession()
    return NextResponse.redirect(new URL(nextPath, request.url))
  }

  await createPublicBookingSession(booking.id)
  return NextResponse.redirect(new URL(nextPath, request.url))
}
