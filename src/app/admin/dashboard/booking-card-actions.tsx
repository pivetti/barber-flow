"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useRef, useState, type Dispatch } from "react"
import { Ban, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  cancelAdminBookingInline,
  concludeAdminBookingInline,
} from "@/features/admin/actions/bookings"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface BookingCardActionsProps {
  bookingId: string
  customerName: string
  customerPhone: string
  onOptimisticStatusChange: Dispatch<OptimisticStatusChangePayload>
  onStatusChangeError: Dispatch<string>
  onStatusChangeSuccess: Dispatch<string>
}

export type BookingCardAction = "conclude" | "cancel"

export interface OptimisticStatusChangePayload {
  bookingId: string
  status: "CANCELED" | "DONE"
}

type PendingAction = BookingCardAction | null

const actionConfig = {
  conclude: {
    label: "Concluir",
    pendingLabel: "Concluindo...",
    successMessage: "Agendamento concluido.",
    errorMessage: "Nao foi possivel concluir o agendamento. Tente novamente.",
    Icon: CheckCircle2,
    run: concludeAdminBookingInline,
  },
  cancel: {
    label: "Cancelar",
    pendingLabel: "Cancelando...",
    successMessage: "Agendamento cancelado.",
    errorMessage: "Nao foi possivel cancelar o agendamento. Tente novamente.",
    Icon: Ban,
    run: cancelAdminBookingInline,
  },
} satisfies Record<
  BookingCardAction,
  {
    label: string
    pendingLabel: string
    successMessage: string
    errorMessage: string
    Icon: typeof CheckCircle2
    run: typeof concludeAdminBookingInline
  }
>

const getWhatsAppUrl = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  const normalized = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${normalized}`
}

const BookingCardActions = ({
  bookingId,
  customerName,
  customerPhone,
  onOptimisticStatusChange,
  onStatusChangeError,
  onStatusChangeSuccess,
}: BookingCardActionsProps) => {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const pendingActionRef = useRef<PendingAction>(null)
  const whatsappUrl = getWhatsAppUrl(customerPhone)

  const handleAction = async (action: BookingCardAction) => {
    if (pendingActionRef.current) {
      return
    }

    const { errorMessage, run, successMessage } = actionConfig[action]

    pendingActionRef.current = action
    setPendingAction(action)

    if (action === "conclude") {
      onOptimisticStatusChange({ bookingId, status: "DONE" })
    }

    if (action === "cancel") {
      onOptimisticStatusChange({ bookingId, status: "CANCELED" })
    }

    try {
      const result = await run(bookingId)

      if (!result.ok) {
        throw new Error("Admin booking action failed")
      }

      onStatusChangeSuccess(bookingId)

      if (action === "cancel") {
        setCancelDialogOpen(false)
      }

      toast.success(successMessage)
      router.refresh()
    } catch {
      onStatusChangeError(bookingId)
      toast.error(errorMessage)
    } finally {
      pendingActionRef.current = null
      setPendingAction(null)
    }
  }

  const renderActionButton = (action: BookingCardAction) => {
    const { Icon, label, pendingLabel } = actionConfig[action]
    const isActionPending = pendingAction === action
    const isAnyActionPending = pendingAction !== null

    return (
      <Button
        type="button"
        variant={action === "cancel" ? "outline" : "default"}
        className={cn(
          "h-9 w-full justify-center gap-1 rounded-xl px-1.5 text-[10px] font-semibold sm:h-10 sm:text-[11px]",
          action === "cancel" &&
            "border-zinc-700/80 bg-zinc-900/85 text-zinc-100 hover:bg-zinc-800",
        )}
        aria-busy={isActionPending}
        aria-label={`${label} agendamento`}
        title={label}
        disabled={isAnyActionPending}
        onClick={() => {
          if (action === "cancel") {
            setCancelDialogOpen(true)
            return
          }

          void handleAction(action)
        }}
      >
        {isActionPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 truncate">{isActionPending ? pendingLabel : label}</span>
      </Button>
    )
  }

  return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {renderActionButton("conclude")}
      {renderActionButton("cancel")}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Cancelar agendamento?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Deseja realmente cancelar o agendamento de {customerName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={pendingAction === "cancel"}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleAction("cancel")}
              disabled={pendingAction === "cancel"}
            >
              {pendingAction === "cancel" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Sim"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Entrar em contato com ${customerName} pelo WhatsApp`}
        title="WhatsApp"
        tabIndex={pendingAction ? -1 : undefined}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center gap-1 rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-1.5 text-[10px] font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/22 sm:h-10 sm:text-[11px]",
          pendingAction && "pointer-events-none opacity-50",
        )}
      >
        <Image
          src="/Logo%20do%20WhatsApp%20em%20estilo%20minimalista.png"
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0"
        />
        <span className="min-w-0 truncate">WhatsApp</span>
      </a>
    </div>
  )
}

export default BookingCardActions
