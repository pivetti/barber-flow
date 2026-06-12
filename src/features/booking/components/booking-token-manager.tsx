"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  cancelManagedBooking,
  getManagedPublicBooking,
} from "@/features/booking/actions/manage-booking-by-token"
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
  customerPhone: string
  date: Date
  cancellationRequested: boolean
  serviceName: string
  barberName: string | null
}

const getStatusLabel = (status: string) => {
  if (status === "SCHEDULED") return "Agendado"
  if (status === "DONE") return "Concluído"
  if (status === "CANCELED") return "Cancelado"
  return status
}

const BookingTokenManager = ({ barbers }: BookingTokenManagerProps) => {
  void barbers
  const [booking, setBooking] = useState<PublicBooking | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const sessionBooking = await getManagedPublicBooking()
      setBooking(sessionBooking)
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
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <h1 className="text-xl font-bold md:text-2xl">Gerenciar agendamento</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Se existir uma sessão válida do seu agendamento, você pode cancelar direto por aqui.
        </p>
      </section>
      {booking && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-zinc-100">Seu agendamento</h2>
          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Cliente: <span className="font-semibold text-zinc-100">{booking.customerName}</span>
              </p>
              <p className="text-sm text-zinc-300">
                Telefone: <span className="font-semibold text-zinc-100">{booking.customerPhone}</span>
              </p>
              <p className="text-sm text-zinc-300">
                Serviço: <span className="font-semibold text-zinc-100">{booking.serviceName}</span>
              </p>
              <p className="text-sm text-zinc-300">
                Barbeiro: <span className="font-semibold text-zinc-100">{booking.barberName ?? "-"}</span>
              </p>
              <p className="text-sm text-zinc-300">
                Data:{" "}
                <span className="font-semibold text-zinc-100">
                  {format(new Date(booking.date), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                </span>
              </p>
              <p className="text-sm text-zinc-300">
                Status: <span className="font-semibold text-zinc-100">{getStatusLabel(booking.status)}</span>
              </p>
              {booking.cancellationRequested && booking.status === "SCHEDULED" && (
                <p className="text-sm font-semibold text-amber-300">
                  Solicitação de cancelamento enviada ao barbeiro.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isPending || booking.status !== "SCHEDULED"}
                  >
                    Cancelar agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle>Tem certeza que deseja cancelar?</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                      Voltar
                    </Button>
                    <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                      Confirmar cancelamento
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Link
                href="https://wa.me/5500000000000"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-brand/40 hover:bg-brand/10"
              >
                Falar com o barbeiro
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-100">Link seguro obrigatório</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Para proteger o isolamento dos agendamentos, cancelamentos só podem ser feitos com o link seguro do comprovante.
        </p>
        <p className="mt-4 text-sm text-zinc-300">
          Se você perdeu esse link, solicite o cancelamento pelo WhatsApp diretamente ao barbeiro responsável.
        </p>
      </section>
    </div>
  )
}

export default BookingTokenManager
