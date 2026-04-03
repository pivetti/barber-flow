const BRASILIA_TIME_ZONE = "America/Sao_Paulo"
const TIME_PARTS_LOCALE = "en-CA"

interface BrasiliaDateParts {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

const brasiliaDateTimeFormatter = new Intl.DateTimeFormat(TIME_PARTS_LOCALE, {
  timeZone: BRASILIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

const getFormatterPartsMap = (date: Date) => {
  const parts = brasiliaDateTimeFormatter.formatToParts(date)

  return parts.reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value
    }

    return result
  }, {})
}

const getTimeZoneOffsetMs = (date: Date) => {
  const parts = getFormatterPartsMap(date)

  const utcTimestamp = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
    0,
  )

  return utcTimestamp - date.getTime()
}

const getSystemTimeZoneOffsetMs = (date: Date) => -date.getTimezoneOffset() * 60 * 1000

export const toBrasiliaWallClock = (date: Date) => {
  const brasiliaOffsetMs = getTimeZoneOffsetMs(date)
  const systemOffsetMs = getSystemTimeZoneOffsetMs(date)

  return new Date(date.getTime() + brasiliaOffsetMs - systemOffsetMs)
}

export const getBrasiliaDateParts = (date: Date): BrasiliaDateParts => {
  const parts = getFormatterPartsMap(date)

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
    seconds: Number(parts.second),
  }
}

export const createUtcDateFromBrasiliaParts = (
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  milliseconds = 0,
) => {
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds)
  const initialDate = new Date(utcGuess)
  const initialOffset = getTimeZoneOffsetMs(initialDate)
  const resolvedDate = new Date(utcGuess - initialOffset)
  const resolvedOffset = getTimeZoneOffsetMs(resolvedDate)

  if (resolvedOffset !== initialOffset) {
    return new Date(utcGuess - resolvedOffset)
  }

  return resolvedDate
}

export const getBrasiliaStartOfDay = (date: Date) => {
  const { year, month, day } = getBrasiliaDateParts(date)
  return createUtcDateFromBrasiliaParts(year, month, day, 0, 0, 0, 0)
}

export const getBrasiliaEndOfDay = (date: Date) => {
  const { year, month, day } = getBrasiliaDateParts(date)
  return createUtcDateFromBrasiliaParts(year, month, day, 23, 59, 59, 999)
}

export const getBrasiliaTodayStart = () => getBrasiliaStartOfDay(new Date())

export const getBrasiliaDayOfWeek = (date: Date) => {
  const { year, month, day } = getBrasiliaDateParts(date)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export const isSameBrasiliaDay = (left: Date, right: Date) => {
  const leftParts = getBrasiliaDateParts(left)
  const rightParts = getBrasiliaDateParts(right)

  return (
    leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day
  )
}
