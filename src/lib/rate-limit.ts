import "server-only"

type PublicRateLimitRoute =
  | "create-booking"
  | "manage-booking-by-token"
  | "get-booking-day-context"

interface CheckRateLimitResult {
  allowed: boolean
  retryAfter?: number
}

export class RateLimitExceededError extends Error {
  statusCode: number
  retryAfter: number
  route: string

  constructor(route: string, retryAfter: number) {
    super("Too many requests, try again later")
    this.name = "RateLimitExceededError"
    this.statusCode = 429
    this.retryAfter = retryAfter
    this.route = route
  }
}

export const checkRateLimit = async (
  ipAddress: string,
  route: PublicRateLimitRoute,
): Promise<CheckRateLimitResult> => {
  void ipAddress
  void route

  return { allowed: true }
}

export const enforceRateLimit = async (
  ipAddress: string,
  route: PublicRateLimitRoute,
) => {
  const result = await checkRateLimit(ipAddress, route)
  if (!result.allowed) {
    throw new RateLimitExceededError(route, result.retryAfter ?? 60)
  }
}
