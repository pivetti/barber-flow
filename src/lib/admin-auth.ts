import { cookies } from "next/headers"
import jwt, { JwtPayload } from "jsonwebtoken"
import { BarberRole } from "@prisma/client"
import { getAppEnv } from "./env"
import { db } from "./prisma"

export const ADMIN_AUTH_COOKIE_NAME = "admin_auth_token"
export const ADMIN_AUTH_EXPIRES_IN_SECONDS = 60 * 15
export const ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS = ADMIN_AUTH_EXPIRES_IN_SECONDS
export const ADMIN_AUTH_RENEW_BEFORE_EXPIRY_SECONDS = 60 * 5
export const ADMIN_AUTH_REFRESH_WINDOW_SECONDS = 60 * 60 * 8

export interface AdminAuthTokenPayload extends JwtPayload {
  sub: string
  name: string
  phone?: string | null
  email?: string | null
  role: BarberRole
  sessionVersion: number
  refreshUntil: number
}

export interface AdminAuthUser {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: BarberRole
  isActive: boolean
}

const getJwtSecret = () => {
  return getAppEnv().JWT_SECRET
}

export const signAdminAuthToken = (payload: AdminAuthTokenPayload) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ADMIN_AUTH_EXPIRES_IN_SECONDS,
  })
}

export const verifyAdminAuthToken = (token: string): AdminAuthTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (typeof decoded === "string") {
      return null
    }

    if (!decoded.sub || !decoded.name) {
      return null
    }

    if (!decoded.role) {
      return null
    }

    if (!["OWNER", "ADMIN", "BARBER"].includes(String(decoded.role))) {
      return null
    }

    if (
      typeof decoded.sessionVersion !== "number" ||
      typeof decoded.refreshUntil !== "number"
    ) {
      return null
    }

    return decoded as AdminAuthTokenPayload
  } catch {
    return null
  }
}

export const getAdminFromToken = async (): Promise<AdminAuthUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const payload = verifyAdminAuthToken(token)
  if (!payload) {
    return null
  }

  const barber = await db.barber.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      password: true,
      role: true,
      isActive: true,
      sessionVersion: true,
    },
  })

  if (
    !barber?.password ||
    !barber.isActive ||
    barber.sessionVersion !== payload.sessionVersion
  ) {
    return null
  }

  return {
    id: barber.id,
    name: barber.name,
    phone: barber.phone ?? null,
    email: barber.email ?? null,
    role: barber.role,
    isActive: barber.isActive,
  }
}

export const shouldRenewAdminAuthToken = (payload: AdminAuthTokenPayload) => {
  const nowInSeconds = Math.floor(Date.now() / 1000)

  if (!payload.exp || payload.refreshUntil <= nowInSeconds) {
    return false
  }

  const remainingLifetime = payload.exp - nowInSeconds
  return remainingLifetime <= ADMIN_AUTH_RENEW_BEFORE_EXPIRY_SECONDS
}

export const adminAuthCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_AUTH_COOKIE_MAX_AGE_SECONDS,
}
