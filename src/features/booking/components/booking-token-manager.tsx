"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CalendarCheck2,
  Info,
  Loader2,
  MessageCircle,
  Plus,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  cancelManagedBooking,
  getManagedPublicBooking,
} from "@/features/booking/actions/manage-booking-by-token"
import {
  CustomerBookingSummaryGrid,
  getCustomerBookingStatusLabel,
} from "@/features/booking/components/customer-booking-summary"

interface BookingTokenManagerProps {
  barbers: Array<{
    id: string
    name: string
  }>
}

interface PublicBooking {
  id: string
  status: string
  customerName: string
  startsAt: Date
  endsAt: Date
  cancellationRequested: boolean
  serviceName: string
  barberName: string | null
  barberPhone: string | null
}

const normalizeWhatsappPhone = (value?: string | null) => {
  const digits = value?.replace(/\D/g, "") ?? ""
  if (!digits) return ""
  if (digits.startsWith("55")) return digits
  return `55${digits}`
}

const BookingTokenManager = ({ barbers }: BookingTokenManagerProps) => {
  void barbers

  const [booking, setBooking] = useState<PublicBooking | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const sessionBooking = await getManagedPublicBooking()
      setBooking(sessionBooking)
      setHasLoaded(true)
    })
  }, [])

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelManagedBooking()
      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setCancelDialogOpen(false)
      const updatedBooking = await getManagedPublicBooking()
      setBooking(updatedBooking)
      setHasLoaded(true)
    })
  }

  const bookingStart = booking ? new Date(booking.startsAt) : null
  const bookingEnd = booking ? new Date(booking.endsAt) : null
  const summaryDate = bookingStart
    ? format(bookingStart, "dd MMM yyyy", { locale: ptBR })
    : ""
  const summaryTime =
    bookingStart && bookingEnd
      ? `${format(bookingStart, "HH:mm")} - ${format(bookingEnd, "HH:mm")}`
      : ""
  const barberWhatsappPhone = normalizeWhatsappPhone(booking?.barberPhone)
  const barberWhatsappUrl = barberWhatsappPhone ? `https://wa.me/${barberWhatsappPhone}` : "#"
  const statusLabel = booking
    ? getCustomerBookingStatusLabel({
        status: booking.status,
        cancellationRequested: booking.cancellationRequested,
      })
    : ""

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800/70 bg-[linear-gradient(145deg,rgba(24,24,27,0.94),rgba(9,9,11,0.92))] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.36)] sm:max-w-2xl sm:p-5">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand/35 bg-brand/15 text-brand-100 shadow-[0_0_28px_rgb(var(--brand-primary-rgb)_/_0.16)]">
          <CalendarCheck2 className="h-5 w-5" />
        </span>
        <h1 className="mt-3 text-xl font-semibold leading-tight text-zinc-50 md:text-2xl">
          Gerencie seu agendamento
        </h1>
        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-zinc-300 sm:text-sm">
          Veja os detalhes do seu horario e faca alteracoes se necessario.
        </p>
      </div>

      {!hasLoaded && (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-2xl border border-zinc-800/70 bg-zinc-900/45 px-4 text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-100" />
          Carregando agendamento...
        </div>
      )}

      {hasLoaded && !booking && (
        <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/45 p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/70 text-brand-100">
              <Info className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100">Link seguro obrigatorio</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                Para proteger seu agendamento, use o link seguro enviado no comprovante.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Se voce perdeu esse link, fale diretamente com o barbeiro responsavel.
              </p>
            </div>
          </div>

          <Link
            href="/agendar"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/12 px-4 text-sm font-semibold text-brand-100 transition-colors hover:bg-brand/20"
          >
            <Plus className="h-4 w-4" />
            Agendar outro horario
          </Link>
        </div>
      )}

      {hasLoaded && booking && (
        <>
          <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/45 p-2.5">
            <CustomerBookingSummaryGrid
              compact
              items={[
                {
                  icon: "customer",
                  label: "Cliente",
                  value: booking.customerName,
                },
                {
                  icon: "service",
                  label: "Servico",
                  value: booking.serviceName,
                },
                {
                  icon: "barber",
                  label: "Barbeiro",
                  value: booking.barberName ?? "Barbeiro",
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
                {
                  icon: "status",
                  label: "Status",
                  value: statusLabel,
                },
              ]}
            />
          </div>

          {booking.cancellationRequested && booking.status === "SCHEDULED" && (
            <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-center text-xs text-amber-100/85">
              Solicitacao de cancelamento enviada ao barbeiro.
            </p>
          )}

          <div className="mt-4 space-y-2">
            <Link
              href={barberWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!barberWhatsappPhone}
              tabIndex={barberWhatsappPhone ? undefined : -1}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25 aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com barbeiro
            </Link>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/agendar"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/12 px-3 text-xs font-semibold text-brand-100 transition-colors hover:bg-brand/20 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                Agendar outro horario
              </Link>

              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isPending || booking.status !== "SCHEDULED"}
                    className="h-10 rounded-xl border-red-500/35 bg-red-500/10 text-xs font-semibold text-red-200 hover:bg-red-500/15 hover:text-red-100 sm:text-sm"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle>Tem certeza que deseja cancelar?</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Esta acao nao pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                      Voltar
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar cancelamento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default BookingTokenManager
