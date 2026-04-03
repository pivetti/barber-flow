import BookingTokenManager from "@/features/booking/components/booking-token-manager"
import Header from "@/components/header"
import { db } from "@/lib/prisma"
import { redirect } from "next/navigation"

interface BookingsPageProps {
  searchParams?: {
    token?: string
  }
}

const BookingsPage = async ({ searchParams }: BookingsPageProps) => {
  const token = searchParams?.token?.trim()
  if (token) {
    redirect(`/bookings/session?token=${encodeURIComponent(token)}&next=/bookings`)
  }

  const barbers = await db.barber.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  })

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <BookingTokenManager barbers={barbers} />
      </main>
    </>
  )
}

export default BookingsPage
