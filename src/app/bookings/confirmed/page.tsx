import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Header from "@/components/header"
import ConfirmedBookingActions from "@/features/booking/components/confirmed-booking-actions"
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

  const formattedDate = format(toBrasiliaWallClock(booking.date), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
  const barberWhatsappPhone = normalizeWhatsappPhone(booking.barber?.phone ?? "")
  const managementUrl = `${getAppEnv().NEXT_PUBLIC_APP_URL}/manage?token=${encodeURIComponent(booking.cancellationToken)}`
  const receiptMessage = [
    "💈 *Comprovante de Agendamento*",
    "",
    `👤 Cliente: ${booking.customerName}`,
    `✂️ Serviço: ${booking.service.name}`,
    `💇 Barbeiro: ${booking.barber?.name ?? "Barbeiro"}`,
    `📅 Data: ${formattedDate}`,
    "",
    "🔗 *Cancelar agendamento:*",
    managementUrl,
  ].join("\n")
  const barberReceiptWhatsappUrl = barberWhatsappPhone
    ? `https://wa.me/${barberWhatsappPhone}?text=${encodeURIComponent(receiptMessage)}`
    : "#"

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <h1 className="text-xl font-bold md:text-2xl">Agendamento confirmado</h1>
          <p className="mt-2 text-sm text-zinc-300">
            {booking.customerName}, seu horario foi reservado com sucesso.
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {booking.service.name} com {booking.barber?.name ?? "barbeiro"} em{" "}
            {formattedDate}.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <p className="mb-4 text-xs font-bold uppercase text-zinc-400">
            Sessão temporária
          </p>

          <ConfirmedBookingActions
            canCancel={booking.status === "SCHEDULED"}
            barberReceiptWhatsappUrl={barberReceiptWhatsappUrl}
            canSendReceipt={Boolean(barberWhatsappPhone)}
          />

          <div className="mt-3">
            <Link
              href="/bookings"
              className="text-xs text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-300"
            >
              Ou gerencie este agendamento na area de agendamentos.
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}

export default ConfirmedBookingPage
