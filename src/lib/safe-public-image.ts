const LOCAL_IMAGE_PATH_REGEX = /^\/[a-zA-Z0-9/_\-.]+$/

export const getSafePublicImagePath = (value: string | null | undefined, fallback: string) => {
  const normalized = (value ?? "").trim()
  if (!normalized) {
    return fallback
  }

  // Keep public rendering restricted to local assets to avoid next/image remote host crashes.
  if (!LOCAL_IMAGE_PATH_REGEX.test(normalized)) {
    return fallback
  }

  return normalized
}
