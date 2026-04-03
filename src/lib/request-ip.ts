import "server-only"
import { headers } from "next/headers"
import { sanitizeText } from "./input-validation"

const MAX_IP_LENGTH = 64

const normalizeIp = (value: string) => {
  const normalized = sanitizeText(value).slice(0, MAX_IP_LENGTH)
  return normalized || "unknown"
}

export const getRequestIp = async () => {
  const requestHeaders = await headers()

  const forwardedFor = requestHeaders.get("x-forwarded-for")
  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(",")[0] ?? "")
  }

  return normalizeIp(
    requestHeaders.get("x-real-ip") ??
      requestHeaders.get("cf-connecting-ip") ??
      requestHeaders.get("x-client-ip") ??
      "",
  )
}
