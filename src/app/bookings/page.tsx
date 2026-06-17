import BookingTokenManager from "@/features/booking/components/booking-token-manager"
import Header from "@/components/header"
import { db } from "@/lib/prisma"
import Link from "next/link"
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(var(--brand-background-rgb)_/_0.16),transparent_40%),linear-gradient(to_bottom,#09090b,#18181b_58%,#09090b)] text-zinc-50">
      <Header />
      <main className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-6xl flex-col justify-center px-3 py-4 sm:px-6 sm:py-8">
        <BookingTokenManager barbers={barbers} />

        <footer className="mx-auto mt-3 w-full max-w-2xl text-center text-[11px] leading-relaxed text-zinc-600">
          Use o link seguro do comprovante para consultar ou ajustar seu agendamento.
          <br />
          <Link
            href="/politica-de-privacidade"
            className="font-medium text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-300"
          >
            Politica de Privacidade
          </Link>
        </footer>
      </main>
    </div>
  )
}

export default BookingsPage
