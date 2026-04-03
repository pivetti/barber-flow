import { sanitizeText } from "./input-validation"

interface ResolveSafePathOptions {
  fallback: string
  requiredPrefix?: string
}

export const resolveSafePath = (
  value: string | undefined,
  { fallback, requiredPrefix }: ResolveSafePathOptions,
) => {
  if (!value) {
    return fallback
  }

  const normalized = sanitizeText(value)
  if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized.length > 200) {
    return fallback
  }

  if (requiredPrefix && !normalized.startsWith(requiredPrefix)) {
    return fallback
  }

  return normalized
}
