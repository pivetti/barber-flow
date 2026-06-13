"use server"

import { z } from "zod"
import { idSchema } from "@/lib/input-validation"
import { RateLimitExceededError, enforceRateLimit } from "@/lib/rate-limit"
import { getRequestIp } from "@/lib/request-ip"
import { getBarberAvailableTimesForDate } from "@/lib/barber-schedule"

interface GetBookingDayContextProps {
  barberId: string
  serviceId: string
  date: Date
}

export const getBookingDayContext = async ({
  barberId,
  serviceId,
  date,
}: GetBookingDayContextProps) => {
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
      serviceId: idSchema,
      date: z.date(),
    })
    .safeParse({ barberId, serviceId, date })

  if (!parsed.success) {
    return {
      availableTimes: [],
    }
  }

  const availableTimes = await getBarberAvailableTimesForDate({
    barberId: parsed.data.barberId,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
  })

  return {
    availableTimes,
  }
}
