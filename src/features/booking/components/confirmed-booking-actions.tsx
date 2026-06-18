"use client"

import { Loader2, MessageCircle, Plus, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { cancelManagedBooking } from "@/features/booking/actions/manage-booking-by-token"

interface ConfirmedBookingActionsProps {
  bookingId: string
  canCancel: boolean
  barberReceiptWhatsappUrl: string
  canSendReceipt: boolean
}

const ConfirmedBookingActions = ({
  bookingId,
  canCancel,
  barberReceiptWhatsappUrl,
  canSendReceipt,
}: ConfirmedBookingActionsProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCanceled, setIsCanceled] = useState(!canCancel)
  const [whatsappBlocked, setWhatsappBlocked] = useState(false)

  useEffect(() => {
    if (!bookingId || !canSendReceipt || barberReceiptWhatsappUrl === "#") {
      return
    }

    const storageKey = `whatsapp_opened_booking_${bookingId}`

    try {
      if (window.sessionStorage.getItem(storageKey)) {
        return
      }

      window.sessionStorage.setItem(storageKey, "true")
    } catch {
      // If storage is unavailable, still try once for this render.
    }

    const opened = window.open(barberReceiptWhatsappUrl, "_blank", "noopener,noreferrer")

    if (!opened) {
      setWhatsappBlocked(true)
    }
  }, [barberReceiptWhatsappUrl, bookingId, canSendReceipt])

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelManagedBooking()
      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setIsCanceled(true)
      setOpen(false)
      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Link
          href={barberReceiptWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canSendReceipt}
          tabIndex={canSendReceipt ? undefined : -1}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" />
          Enviar comprovante pelo WhatsApp
        </Link>

        {whatsappBlocked && (
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-center text-xs text-amber-100/85">
            Se o WhatsApp nao abrir automaticamente, toque no botao acima.
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href="/agendar"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/12 px-4 text-sm font-semibold text-brand-100 transition-colors hover:bg-brand/20"
        >
          <Plus className="h-4 w-4" />
          Agendar mais um horario
        </Link>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={isPending || isCanceled}
              className="h-11 rounded-xl border-red-500/35 bg-red-500/10 text-sm font-semibold text-red-200 hover:bg-red-500/15 hover:text-red-100"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
            <DialogHeader>
              <DialogTitle>Confirmar cancelamento</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Voce tem certeza que deseja cancelar este agendamento?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
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
  )
}

export default ConfirmedBookingActions
