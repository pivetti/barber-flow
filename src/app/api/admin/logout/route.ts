import { NextRequest, NextResponse } from "next/server"
import {
  ADMIN_AUTH_COOKIE_NAME,
  adminAuthCookieOptions,
  verifyAdminAuthToken,
} from "@/lib/admin-auth"
import { db } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value

  if (token) {
    const payload = verifyAdminAuthToken(token)
    if (payload?.sub) {
      await db.barber.updateMany({
        where: { id: payload.sub },
        data: {
          sessionVersion: { increment: 1 },
        },
      })
    }
  }

  const response = NextResponse.json({ message: "logout successful" }, { status: 200 })

  response.cookies.set(ADMIN_AUTH_COOKIE_NAME, "", {
    ...adminAuthCookieOptions,
    maxAge: 0,
  })

  return response
}
