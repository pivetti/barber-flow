import { Prisma } from "@prisma/client"

const BOOKING_OVERLAP_CONSTRAINT_NAME = "Booking_barberId_active_interval_excl"

export const BOOKING_OVERLAP_ERROR_MESSAGE =
  "Este horario ja esta agendado. Escolha outro."

export const isBookingOverlapConstraintError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  const databaseError =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? String(error.meta?.database_error ?? "")
      : ""
  const combinedMessage = `${message}\n${databaseError}`.toLowerCase()

  return (
    combinedMessage.includes(BOOKING_OVERLAP_CONSTRAINT_NAME.toLowerCase()) ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2004" &&
      (combinedMessage.includes("23p01") ||
        combinedMessage.includes("exclusion constraint")))
  )
}
