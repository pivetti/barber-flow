"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Ban, CheckCircle2, Trash2 } from "lucide-react"
import {
  cancelAdminBookingInline,
  concludeAdminBookingInline,
  deleteAdminBookingInline,
} from "@/features/admin/actions/bookings"
import { Button } from "@/components/ui/button"

interface BookingCardActionsProps {
  bookingId: string
}

type PendingAction = "conclude" | "cancel" | "delete" | null

const BookingCardActions = ({ bookingId }: BookingCardActionsProps) => {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isPending, startTransition] = useTransition()

  const handleAction = (action: PendingAction) => {
    if (!action) {
      return
    }

    startTransition(async () => {
      setPendingAction(action)

      try {
        const result =
          action === "conclude"
            ? await concludeAdminBookingInline(bookingId)
            : action === "cancel"
              ? await cancelAdminBookingInline(bookingId)
              : await deleteAdminBookingInline(bookingId)

        if (result.ok) {
          router.refresh()
        }
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      <Button
        type="button"
        variant="default"
        className="h-9 w-full justify-center gap-1 rounded-xl px-1.5 text-[10px] font-semibold sm:h-10 sm:text-[11px]"
        aria-label="Concluir agendamento"
        title="Concluir"
        disabled={isPending}
        onClick={() => handleAction("conclude")}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{pendingAction === "conclude" ? "..." : "Concluir"}</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-center gap-1 rounded-xl border-zinc-700/80 bg-zinc-900/85 px-1.5 text-[10px] font-semibold text-zinc-100 hover:bg-zinc-800 sm:h-10 sm:text-[11px]"
        aria-label="Cancelar agendamento"
        title="Cancelar"
        disabled={isPending}
        onClick={() => handleAction("cancel")}
      >
        <Ban className="h-4 w-4 shrink-0" />
        <span>{pendingAction === "cancel" ? "..." : "Cancelar"}</span>
      </Button>

      <Button
        type="button"
        variant="destructive"
        className="h-9 w-full justify-center gap-1 rounded-xl px-1.5 text-[10px] font-semibold sm:h-10 sm:text-[11px]"
        aria-label="Excluir agendamento"
        title="Excluir"
        disabled={isPending}
        onClick={() => handleAction("delete")}
      >
        <Trash2 className="h-4 w-4 shrink-0" />
        <span>{pendingAction === "delete" ? "..." : "Excluir"}</span>
      </Button>
    </div>
  )
}

export default BookingCardActions
