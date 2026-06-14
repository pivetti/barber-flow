import { CalendarDays, Check, CheckCircle2, Clock3, Pencil, Scissors, UserRound } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type BookingProgressField = "client" | "service" | "time" | "date"

interface BookingFlowProgressProps {
  bookingId: string
  activeField?: BookingProgressField
  showEditAction?: boolean
}

const bookingProgressSteps = [
  {
    field: "client",
    label: "Cliente",
    number: "01",
    Icon: UserRound,
  },
  {
    field: "service",
    label: "Servico",
    number: "02",
    Icon: Scissors,
  },
  {
    field: "time",
    label: "Horario",
    number: "03",
    Icon: Clock3,
  },
  {
    field: "date",
    label: "Data",
    number: "04",
    Icon: CalendarDays,
  },
  {
    field: "confirmation",
    label: "Confirmacao",
    number: "05",
    Icon: CheckCircle2,
  },
] as const

const getStepHref = ({
  bookingId,
  field,
}: {
  bookingId: string
  field: (typeof bookingProgressSteps)[number]["field"]
}) => {
  if (field === "confirmation") {
    return `/admin/bookings/${bookingId}`
  }

  return `/admin/bookings/${bookingId}/edit?field=${field}`
}

const BookingFlowProgress = ({
  bookingId,
  activeField,
  showEditAction = false,
}: BookingFlowProgressProps) => {
  const isEditing = Boolean(activeField)

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-100/75">
            Fluxo do agendamento
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">
            Etapas preenchidas
          </h2>
        </div>

        {showEditAction && (
          <Link
            href={`/admin/bookings/${bookingId}/edit?field=client`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-3 text-xs font-semibold text-zinc-100 transition-colors hover:border-brand/35 hover:bg-zinc-800 sm:w-auto"
          >
            <Pencil className="h-4 w-4" />
            Editar agendamento
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {bookingProgressSteps.map((step) => {
          const isActive = activeField === step.field
          const isConfirmation = step.field === "confirmation"
          const href = isEditing ? getStepHref({ bookingId, field: step.field }) : undefined
          const StepIcon = step.Icon
          const content = (
            <span
              className={cn(
                "flex h-full min-h-[72px] items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                isActive
                  ? "border-brand-hover/60 bg-brand/15 text-brand-100 shadow-sm shadow-brand-950/25"
                  : "border-zinc-800 bg-zinc-900/55 text-zinc-200",
                href && "hover:border-brand/35 hover:bg-zinc-900",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  isActive
                    ? "border-brand-hover bg-brand text-white"
                    : "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
                )}
              >
                {isActive ? step.number : <Check className="h-4 w-4" />}
              </span>

              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                  <StepIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{step.label}</span>
                </span>
                <span className="mt-1 block text-[11px] font-medium text-zinc-500">
                  {isActive ? "Editando" : isConfirmation ? "Resumo" : "Concluido"}
                </span>
              </span>
            </span>
          )

          if (!href) {
            return <div key={step.field}>{content}</div>
          }

          return (
            <Link key={step.field} href={href} className="block focus-visible:outline-none">
              {content}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default BookingFlowProgress
