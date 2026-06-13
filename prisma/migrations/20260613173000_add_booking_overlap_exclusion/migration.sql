-- Enable GiST operator classes for scalar equality (barberId is stored as TEXT).
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Prisma DateTime maps to TIMESTAMP(3) in this schema, so use tsrange.
-- The '[)' bounds allow one booking to end exactly when the next one starts.
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_barberId_active_interval_excl"
EXCLUDE USING gist (
  "barberId" WITH =,
  tsrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" <> 'CANCELED'::"BookingStatus");
