"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { cancelManagedBooking } from "@/features/booking/actions/manage-booking-by-token"
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
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <div className="flex flex-col gap-1.5">
        <Link
          href={barberReceiptWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canSendReceipt}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          <Image
            src="/Logo do WhatsApp em estilo minimalista.png"
            alt="WhatsApp"
            width={16}
            height={16}
            className="h-4 w-4 object-contain"
          />
          Enviar ao barbeiro
        </Link>
        <p className="max-w-sm text-sm text-zinc-400">
          Clique para enviar o comprovante do agendamento para o WhatsApp do barbeiro.
        </p>
        {whatsappBlocked && (
          <p className="max-w-sm rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Se o WhatsApp nao abriu automaticamente, toque no botao acima.
          </p>
        )}
      </div>

      <Link
        href="/agendar"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 px-4 text-sm font-semibold text-brand-100 transition-colors hover:bg-brand/20"
      >
        Agendar mais um horário
      </Link>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={isPending || isCanceled}>
            Cancelar agendamento agora
          </Button>
        </DialogTrigger>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Confirmar cancelamento</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Você tem certeza que deseja cancelar este agendamento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ConfirmedBookingActions
