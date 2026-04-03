"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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
  canCancel: boolean
  barberReceiptWhatsappUrl: string
  canSendReceipt: boolean
}

const ConfirmedBookingActions = ({
  canCancel,
  barberReceiptWhatsappUrl,
  canSendReceipt,
}: ConfirmedBookingActionsProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCanceled, setIsCanceled] = useState(!canCancel)

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
      </div>

      <Link
        href="/agendar"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/20"
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
