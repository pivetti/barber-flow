import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Check } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Header from "@/components/header"
import ConfirmedBookingActions from "@/features/booking/components/confirmed-booking-actions"
import { CustomerBookingSummaryGrid } from "@/features/booking/components/customer-booking-summary"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { getAppEnv } from "@/lib/env"
import { getPublicBookingFromSession } from "@/lib/public-booking-session"

interface ConfirmedBookingPageProps {
  searchParams?: {
    token?: string
  }
}

const normalizeWhatsappPhone = (value: string) => {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("55")) return digits
  return `55${digits}`
}

const ConfirmedBookingPage = async ({ searchParams }: ConfirmedBookingPageProps) => {
  const token = searchParams?.token?.trim()
  if (token) {
    redirect(`/bookings/session?token=${encodeURIComponent(token)}&next=/bookings/confirmed`)
  }

  const booking = await getPublicBookingFromSession()
  if (!booking) {
    notFound()
  }

  const bookingStart = toBrasiliaWallClock(booking.startsAt)
  const bookingEnd = toBrasiliaWallClock(booking.endsAt)
  const formattedDate = format(bookingStart, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
  const summaryDate = format(bookingStart, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const summaryTime = `${format(bookingStart, "HH:mm")} ate ${format(bookingEnd, "HH:mm")}`
  const barberWhatsappPhone = normalizeWhatsappPhone(booking.barber?.phone ?? "")
  const managementPath = `/manage?token=${encodeURIComponent(booking.cancellationToken)}`
  const managementUrl = `${getAppEnv().NEXT_PUBLIC_APP_URL}${managementPath}`
  const receiptMessage = [
    "*Comprovante de Agendamento*",
    "",
    `Cliente: ${booking.customerName}`,
    `Servico: ${booking.serviceName}`,
    `Barbeiro: ${booking.barber?.name ?? "Barbeiro"}`,
    `Data: ${formattedDate}`,
    "",
    "*Cancelar agendamento:*",
    managementUrl,
  ].join("\n")
  const barberReceiptWhatsappUrl = barberWhatsappPhone
    ? `https://wa.me/${barberWhatsappPhone}?text=${encodeURIComponent(receiptMessage)}`
    : "#"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(var(--brand-background-rgb)_/_0.16),transparent_40%),linear-gradient(to_bottom,#09090b,#18181b_58%,#09090b)] text-zinc-50">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-800/70 bg-[linear-gradient(145deg,rgba(24,24,27,0.94),rgba(9,9,11,0.92))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.42)] sm:p-6">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 shadow-[0_0_32px_rgba(16,185,129,0.16)]">
              <Check className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">
              Agendamento confirmado
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-300">
              {booking.customerName}, seu horario foi reservado com sucesso.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-900/45 p-3">
            <CustomerBookingSummaryGrid
              items={[
                {
                  icon: "service",
                  label: "Servico",
                  value: booking.serviceName,
                },
                {
                  icon: "barber",
                  label: "Barbeiro",
                  value: booking.barber?.name ?? "Barbeiro",
                },
                {
                  icon: "date",
                  label: "Data",
                  value: summaryDate,
                },
                {
                  icon: "time",
                  label: "Horario",
                  value: summaryTime,
                },
              ]}
            />
          </div>

          <div className="mt-5">
            <ConfirmedBookingActions
              bookingId={booking.id}
              canCancel={booking.status === "SCHEDULED"}
              barberReceiptWhatsappUrl={barberReceiptWhatsappUrl}
              canSendReceipt={Boolean(barberWhatsappPhone)}
            />
          </div>

        </section>

        <footer className="mx-auto mt-4 w-full max-w-2xl text-center text-xs leading-relaxed text-zinc-600">
          Guarde este comprovante para consultar os dados do seu agendamento.
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

export default ConfirmedBookingPage
