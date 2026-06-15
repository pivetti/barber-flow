const LOCAL_IMAGE_PATH_REGEX = /^\/[a-zA-Z0-9/_\-.]+$/
const REMOTE_IMAGE_URL_REGEX = /^https?:\/\/[^\s]+$/i

export const getSafePublicImagePath = (value: string | null | undefined, fallback: string) => {
  const normalized = (value ?? "").trim()
  if (!normalized) {
    return fallback
  }

  if (!LOCAL_IMAGE_PATH_REGEX.test(normalized) && !REMOTE_IMAGE_URL_REGEX.test(normalized)) {
    return fallback
  }

  return normalized
}
