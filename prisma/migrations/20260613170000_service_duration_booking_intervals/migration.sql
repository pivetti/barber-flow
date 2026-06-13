-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'DONE', 'CANCELED');

-- AlterTable: Service scheduling metadata with safe defaults for existing rows.
ALTER TABLE "Service"
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: add interval and service snapshot columns as nullable first,
-- then backfill from the legacy date/service relation before enforcing NOT NULL.
ALTER TABLE "Booking"
ADD COLUMN "startsAt" TIMESTAMP(3),
ADD COLUMN "endsAt" TIMESTAMP(3),
ADD COLUMN "serviceName" TEXT,
ADD COLUMN "servicePrice" DECIMAL(10, 2),
ADD COLUMN "serviceDurationMinutes" INTEGER,
ADD COLUMN "serviceBufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "serviceBufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_new" "BookingStatus" NOT NULL DEFAULT 'SCHEDULED';

UPDATE "Booking" AS booking
SET
  "status_new" = CASE
    WHEN booking."status" IN ('SCHEDULED', 'DONE', 'CANCELED')
      THEN booking."status"::"BookingStatus"
    ELSE 'SCHEDULED'::"BookingStatus"
  END,
  "startsAt" = booking."date",
  "serviceName" = COALESCE(service."name", 'Servico removido'),
  "servicePrice" = COALESCE(service."price", 0),
  "serviceDurationMinutes" = COALESCE(service."durationMinutes", 30),
  "serviceBufferBeforeMinutes" = COALESCE(service."bufferBeforeMinutes", 0),
  "serviceBufferAfterMinutes" = COALESCE(service."bufferAfterMinutes", 0)
FROM "Service" AS service
WHERE booking."serviceId" = service."id";

UPDATE "Booking"
SET
  "startsAt" = COALESCE("startsAt", "date"),
  "serviceName" = COALESCE("serviceName", 'Servico removido'),
  "servicePrice" = COALESCE("servicePrice", 0),
  "serviceDurationMinutes" = COALESCE("serviceDurationMinutes", 30);

UPDATE "Booking"
SET "endsAt" = "startsAt" + ("serviceDurationMinutes" * INTERVAL '1 minute')
WHERE "endsAt" IS NULL;

ALTER TABLE "Booking"
ALTER COLUMN "startsAt" SET NOT NULL,
ALTER COLUMN "endsAt" SET NOT NULL,
ALTER COLUMN "serviceName" SET NOT NULL,
ALTER COLUMN "servicePrice" SET NOT NULL,
ALTER COLUMN "serviceDurationMinutes" SET NOT NULL;

-- Replace legacy point-in-time status/date columns after preserving their values.
DROP INDEX IF EXISTS "Booking_barberId_date_idx";
DROP INDEX IF EXISTS "Booking_barberId_status_idx";

ALTER TABLE "Booking" DROP COLUMN "status";
ALTER TABLE "Booking" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Booking" DROP COLUMN "date";

-- CreateIndex
CREATE INDEX "Booking_barberId_startsAt_idx" ON "Booking"("barberId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_barberId_endsAt_idx" ON "Booking"("barberId", "endsAt");

-- CreateIndex
CREATE INDEX "Booking_barberId_status_idx" ON "Booking"("barberId", "status");
