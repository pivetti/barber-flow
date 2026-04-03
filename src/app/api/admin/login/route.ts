import bcrypt from "bcrypt"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_AUTH_REFRESH_WINDOW_SECONDS,
  adminAuthCookieOptions,
  signAdminAuthToken,
} from "@/lib/admin-auth"
import { emailSchema, passwordSchema, sanitizeText } from "@/lib/input-validation"
import { db } from "@/lib/prisma"

interface AdminLoginBody {
  email?: string
  password?: string
}

const adminLoginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

const MAX_FAILED_ATTEMPTS = 15
const ATTEMPT_WINDOW_MINUTES = 15
const BLOCK_DURATION_MINUTES = 10

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return sanitizeText(forwardedFor.split(",")[0] ?? "").slice(0, 64) || "unknown"
  }

  return sanitizeText(request.headers.get("x-real-ip") ?? "").slice(0, 64) || "unknown"
}

const getBlockedResponse = (blockedUntil: Date) => {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((blockedUntil.getTime() - Date.now()) / 1000),
  )

  return NextResponse.json(
    { error: "too many attempts, try again in a few minutes" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  )
}

const registerFailedAttempt = async (email: string, ipAddress: string, now: Date) => {
  const windowMs = ATTEMPT_WINDOW_MINUTES * 60 * 1000
  const blockMs = BLOCK_DURATION_MINUTES * 60 * 1000

  return db.$transaction(async (tx) => {
    const current = await tx.adminLoginAttempt.findUnique({
      where: {
        email_ipAddress: {
          email,
          ipAddress,
        },
      },
    })

    if (!current) {
      await tx.adminLoginAttempt.create({
        data: {
          email,
          ipAddress,
          failedAttempts: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
        },
      })
      return null
    }

    if (current.blockedUntil && current.blockedUntil > now) {
      return current.blockedUntil
    }

    const isOutsideWindow = now.getTime() - current.windowStartedAt.getTime() > windowMs
    const nextFailedAttempts = isOutsideWindow ? 1 : current.failedAttempts + 1
    const blockedUntil =
      nextFailedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + blockMs)
        : null

    await tx.adminLoginAttempt.update({
      where: {
        email_ipAddress: {
          email,
          ipAddress,
        },
      },
      data: {
        failedAttempts: nextFailedAttempts,
        windowStartedAt: isOutsideWindow ? now : current.windowStartedAt,
        blockedUntil,
        lastAttemptAt: now,
      },
    })

    return blockedUntil
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdminLoginBody
    const parsed = adminLoginBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid login payload" }, { status: 400 })
    }

    const { email, password } = parsed.data
    const ipAddress = getClientIp(request)

    const now = new Date()
    const rateLimit = await db.adminLoginAttempt.findUnique({
      where: {
        email_ipAddress: {
          email,
          ipAddress,
        },
      },
      select: {
        blockedUntil: true,
      },
    })

    if (rateLimit?.blockedUntil && rateLimit.blockedUntil > now) {
      return getBlockedResponse(rateLimit.blockedUntil)
    }

    const barber = await db.barber.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        password: true,
        role: true,
        isActive: true,
        sessionVersion: true,
      },
    })

    if (!barber?.password || !barber.isActive) {
      const blockedUntil = await registerFailedAttempt(email, ipAddress, now)
      if (blockedUntil && blockedUntil > now) {
        return getBlockedResponse(blockedUntil)
      }

      return NextResponse.json({ error: "invalid credentials" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, barber.password)
    if (!isPasswordValid) {
      const blockedUntil = await registerFailedAttempt(email, ipAddress, now)
      if (blockedUntil && blockedUntil > now) {
        return getBlockedResponse(blockedUntil)
      }

      return NextResponse.json({ error: "invalid credentials" }, { status: 401 })
    }

    await db.adminLoginAttempt.deleteMany({
      where: {
        email,
        ipAddress,
      },
    })

    const nowInSeconds = Math.floor(Date.now() / 1000)
    const token = signAdminAuthToken({
      sub: barber.id,
      name: barber.name,
      phone: barber.phone,
      email: barber.email,
      role: barber.role,
      sessionVersion: barber.sessionVersion,
      refreshUntil: nowInSeconds + ADMIN_AUTH_REFRESH_WINDOW_SECONDS,
    })

    const response = NextResponse.json(
      {
        message: "login successful",
        barber: {
          id: barber.id,
          name: barber.name,
          phone: barber.phone,
          email: barber.email,
          role: barber.role,
        },
      },
      { status: 200 },
    )

    response.cookies.set(ADMIN_AUTH_COOKIE_NAME, token, adminAuthCookieOptions)

    return response
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid json body" }, { status: 400 })
    }

    return NextResponse.json({ error: "internal server error" }, { status: 500 })
  }
}
