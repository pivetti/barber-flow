"use server"

import { z } from "zod"
import { idSchema } from "@/lib/input-validation"
import { RateLimitExceededError, enforceRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"
import { getBarberAvailableTimesForDate } from "@/lib/barber-schedule"

interface GetBookingDayContextProps {
  barberId: string
  date: Date
}

export const getBookingDayContext = async ({ barberId, date }: GetBookingDayContextProps) => {
  try {
    const ipAddress = await getRequestIp()
    await enforceRateLimit(ipAddress, "get-booking-day-context")
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        availableTimes: [],
      }
    }

    throw error
  }

  const parsed = z
    .object({
      barberId: idSchema,
      date: z.date(),
    })
    .safeParse({ barberId, date })

  if (!parsed.success) {
    return {
      availableTimes: [],
    }
  }

  const availableTimes = await getBarberAvailableTimesForDate({
    barberId: parsed.data.barberId,
    date: parsed.data.date,
  })

  return {
    availableTimes,
  }
}
