"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type Dispatch, type FormEvent, useRef, useState } from "react"
import {
  Ban,
  CalendarDays,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { cancelAdminBookingInline } from "@/features/admin/actions/bookings"
import {
  createBlockedTime,
  type CreateBlockedTimeResult,
} from "@/features/admin/actions/schedule"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type BookingConflictResult = Extract<
  CreateBlockedTimeResult,
  { reason: "BOOKING_CONFLICT" }
>
type BookingConflict = BookingConflictResult["conflicts"][number]

interface BlockedTimeDraft {
  date: string
  startTime: string
  endTime: string
  reason: string
}

interface BookingConflictCardProps {
  booking: BookingConflict
  isActionDisabled: boolean
  onCancelClick: Dispatch<BookingConflict>
}

const BRASILIA_TIME_ZONE = "America/Sao_Paulo"

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BRASILIA_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BRASILIA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})

const statusLabelMap: Record<string, string> = {
  SCHEDULED: "Agendado",
  DONE: "Concluído",
  CANCELED: "Cancelado",
}

const createBlockedTimeFormData = (draft: BlockedTimeDraft) => {
  const formData = new FormData()
  formData.set("date", draft.date)
  formData.set("startTime", draft.startTime)
  formData.set("endTime", draft.endTime)
  formData.set("reason", draft.reason)
  return formData
}

const getDraftFromForm = (form: HTMLFormElement): BlockedTimeDraft => {
  const formData = new FormData(form)

  return {
    date: String(formData.get("date") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    reason: String(formData.get("reason") ?? ""),
  }
}

const formatBrasiliaDate = (isoDate: string) => dateFormatter.format(new Date(isoDate))

const formatBrasiliaTime = (isoDate: string) => timeFormatter.format(new Date(isoDate))

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 10) {
    return digits.replace(
      /^([0-9]{0,2})([0-9]{0,4})([0-9]{0,4}).*/,
      (_, ddd, firstPart, secondPart) => {
        if (!ddd) return ""
        if (!firstPart) return `(${ddd}`
        if (!secondPart) return `(${ddd}) ${firstPart}`
        return `(${ddd}) ${firstPart}-${secondPart}`
      },
    )
  }

  return digits.replace(/^([0-9]{2})([0-9]{5})([0-9]{4}).*/, "($1) $2-$3")
}

const getWhatsAppUrl = (booking: BookingConflict) => {
  const digits = booking.customerPhone.replace(/\D/g, "")
  const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`
  const message = `Olá, ${booking.customerName}. Tudo bem? Precisamos ajustar seu agendamento do dia ${formatBrasiliaDate(
    booking.startsAt,
  )} às ${formatBrasiliaTime(
    booking.startsAt,
  )}. Você prefere remarcar para outro horário?`

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
}

const getConflictDescription = (result: BookingConflictResult) => {
  const conflictCount = result.conflicts.length

  if (conflictCount === 0) {
    return "Todos os agendamentos conflitantes foram resolvidos. Tente bloquear novamente para confirmar que o período está livre."
  }

  const periodLabel = `${formatBrasiliaTime(result.blockedStart)} e ${formatBrasiliaTime(
    result.blockedEnd,
  )}`
  const conflictText =
    conflictCount === 1
      ? `Existe 1 agendamento ativo entre ${periodLabel}.`
      : `Existem ${conflictCount} agendamentos ativos entre ${periodLabel}.`

  return `${conflictText} Para bloquear esse horário, cancele ou remarque os atendimentos abaixo.`
}

const BookingConflictCard = ({
  booking,
  isActionDisabled,
  onCancelClick,
}: BookingConflictCardProps) => {
  const statusLabel = statusLabelMap[booking.status] ?? booking.status

  return (
    <article className="rounded-2xl border border-zinc-800/70 bg-zinc-950/55 p-3.5 shadow-[0_10px_22px_rgba(0,0,0,0.22)] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex h-9 min-w-[118px] items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/12 px-3 text-sm font-semibold text-amber-200">
            {formatBrasiliaTime(booking.startsAt)} - {formatBrasiliaTime(booking.endsAt)}
          </p>
          <h3 className="mt-3 break-words text-base font-semibold leading-tight text-zinc-100">
            {booking.customerName}
          </h3>
          <p className="mt-1 break-words text-sm font-medium text-zinc-300">
            {booking.serviceName}
          </p>
        </div>

        <span className="inline-flex w-fit shrink-0 rounded-full border border-brand/40 bg-brand/16 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-100">
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl border border-zinc-800/65 bg-zinc-900/45 p-3 text-xs text-zinc-400 sm:grid-cols-2">
        <p>
          Data:{" "}
          <span className="font-medium text-zinc-200">
            {formatBrasiliaDate(booking.startsAt)}
          </span>
        </p>
        <p>
          Telefone:{" "}
          <span className="font-medium text-zinc-200">{formatPhone(booking.customerPhone)}</span>
        </p>
        <p className="sm:col-span-2">
          Barbeiro: <span className="font-medium text-zinc-200">{booking.barberName}</span>
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Button
          asChild
          className="h-10 rounded-xl border border-emerald-500/35 bg-emerald-500/12 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/22"
        >
          <a
            href={getWhatsAppUrl(booking)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir WhatsApp de ${booking.customerName}`}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            WhatsApp
          </a>
        </Button>

        <Button
          asChild
          variant="outline"
          className="h-10 rounded-xl border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-100 hover:bg-zinc-800"
        >
          <Link href={`/admin/bookings/${booking.id}/edit?field=time`}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Remarcar
          </Link>
        </Button>

        <Button
          type="button"
          variant="destructive"
          className="h-10 rounded-xl text-xs font-semibold"
          disabled={isActionDisabled}
          onClick={() => onCancelClick(booking)}
        >
          <Ban className="mr-1.5 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </article>
  )
}

const BlockedTimeForm = () => {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictResult, setConflictResult] = useState<BookingConflictResult | null>(null)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [lastDraft, setLastDraft] = useState<BlockedTimeDraft | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<BookingConflict | null>(null)
  const [isCancelingBooking, setIsCancelingBooking] = useState(false)

  const remainingConflictCount = conflictResult?.conflicts.length ?? 0
  const dashboardHref = lastDraft ? `/admin/dashboard?date=${lastDraft.date}` : "/admin/dashboard"
  const canRetryBlockedTime = Boolean(lastDraft && conflictResult && remainingConflictCount === 0)

  const handleCreateBlockedTime = async ({
    draft,
    resetFormOnSuccess,
  }: {
    draft: BlockedTimeDraft
    resetFormOnSuccess: boolean
  }) => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createBlockedTime(createBlockedTimeFormData(draft))

      if (result.ok) {
        toast.success("Bloqueio criado com sucesso.")
        setConflictDialogOpen(false)
        setConflictResult(null)
        setLastDraft(null)
        router.refresh()

        if (resetFormOnSuccess) {
          formRef.current?.reset()
        }

        return
      }

      if (result.reason === "BOOKING_CONFLICT") {
        setConflictResult(result)
        setConflictDialogOpen(true)
        toast.warning("Existem agendamentos ativos neste período.")
        return
      }

      toast.error(result.message)
    } catch {
      toast.error("Não foi possível criar o bloqueio agora.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const draft = getDraftFromForm(event.currentTarget)
    setLastDraft(draft)

    void handleCreateBlockedTime({
      draft,
      resetFormOnSuccess: true,
    })
  }

  const handleRetryBlockedTime = () => {
    if (!lastDraft) {
      return
    }

    void handleCreateBlockedTime({
      draft: lastDraft,
      resetFormOnSuccess: true,
    })
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel || isCancelingBooking) {
      return
    }

    const bookingId = bookingToCancel.id
    const previousConflictCount = remainingConflictCount
    setIsCancelingBooking(true)

    try {
      const result = await cancelAdminBookingInline(bookingId)

      if (!result.ok) {
        throw new Error("Cancel failed")
      }

      setConflictResult((currentResult) => {
        if (!currentResult) {
          return currentResult
        }

        return {
          ...currentResult,
          conflicts: currentResult.conflicts.filter((conflict) => conflict.id !== bookingId),
        }
      })
      setBookingToCancel(null)
      toast.success("Agendamento cancelado.")

      if (previousConflictCount === 1) {
        toast.success("Todos os conflitos foram resolvidos.")
      }

      router.refresh()
    } catch {
      toast.error("Não foi possível cancelar este agendamento.")
    } finally {
      setIsCancelingBooking(false)
    }
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-zinc-300">
          Data
          <Input
            type="date"
            name="date"
            required
            className="mt-1 block h-14 w-full appearance-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-white"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Hora inicial
          <Input
            type="time"
            name="startTime"
            required
            step={60}
            className="mt-1 block h-14 w-full appearance-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-white"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Hora final
          <Input
            type="time"
            name="endTime"
            required
            step={60}
            className="mt-1 block h-14 w-full appearance-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-white"
          />
        </label>
        <label className="text-sm text-zinc-300 md:col-span-2">
          Motivo (opcional)
          <Input
            name="reason"
            placeholder="Ex: Almoco, compromisso externo"
            className="mt-1 border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
          />
        </label>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25 md:col-span-2 md:w-fit"
        >
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          {isSubmitting ? "Verificando..." : "Adicionar bloqueio"}
        </Button>
      </form>

      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.48)] sm:max-w-3xl">
          {conflictResult && (
            <>
              <DialogHeader>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/85">
                  Conflito de agenda
                </p>
                <DialogTitle>Não foi possível bloquear este período</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {getConflictDescription(conflictResult)}
                </DialogDescription>
              </DialogHeader>

              <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/45 p-3.5 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Agendamentos afetados
                  </h2>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs font-semibold text-zinc-300">
                    {remainingConflictCount}
                  </span>
                </div>

                {remainingConflictCount === 0 ? (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Nenhum agendamento conflitante permanece neste período.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conflictResult.conflicts.map((booking) => (
                      <BookingConflictCard
                        key={booking.id}
                        booking={booking}
                        isActionDisabled={isCancelingBooking || isSubmitting}
                        onCancelClick={setBookingToCancel}
                      />
                    ))}
                  </div>
                )}
              </section>

              {canRetryBlockedTime && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-sm text-emerald-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="leading-relaxed">
                      A lista de conflitos está vazia. Você já pode tentar criar o bloqueio
                      novamente.
                    </p>
                    <Button
                      type="button"
                      onClick={handleRetryBlockedTime}
                      disabled={isSubmitting}
                      className="h-10 shrink-0 rounded-xl border border-emerald-400/35 bg-emerald-500/16 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                      )}
                      Tentar bloquear novamente
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConflictDialogOpen(false)}
                  disabled={isSubmitting || isCancelingBooking}
                  className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                >
                  Voltar
                </Button>
                <Button
                  asChild
                  className="border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25"
                >
                  <Link href={dashboardHref}>
                    <CalendarDays className="mr-1.5 h-4 w-4" />
                    Ver agenda do dia
                  </Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={bookingToCancel !== null}
        onOpenChange={(open) => {
          if (!open && !isCancelingBooking) {
            setBookingToCancel(null)
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Cancelar agendamento?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Deseja realmente cancelar o agendamento de {bookingToCancel?.customerName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBookingToCancel(null)}
              disabled={isCancelingBooking}
              className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleCancelBooking()}
              disabled={isCancelingBooking}
            >
              {isCancelingBooking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-1.5 h-4 w-4" />
              )}
              {isCancelingBooking ? "Cancelando..." : "Cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BlockedTimeForm
