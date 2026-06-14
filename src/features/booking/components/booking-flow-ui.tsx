import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BookingFlowProgressStep {
  label: string
  isActive: boolean
  isComplete: boolean
}

interface BookingFlowProgressProps {
  steps: BookingFlowProgressStep[]
}

interface BookingStepShellProps {
  id: string
  eyebrow: string
  title: string
  description: string
  isActive: boolean
  isComplete: boolean
  isDisabled?: boolean
  children: ReactNode
}

interface BookingSummaryRowProps {
  label: string
  value: string
  isReady: boolean
  compact?: boolean
}

export const BookingStepStatus = ({
  isComplete,
  isActive,
}: {
  isComplete: boolean
  isActive: boolean
}) => {
  if (isComplete) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <Check className="h-4 w-4" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
        isActive
          ? "border-brand-hover bg-brand/15 text-brand-100"
          : "border-zinc-700 bg-zinc-900 text-zinc-500",
      )}
    >
      {isActive ? "..." : ""}
    </span>
  )
}

export const BookingStepShell = ({
  id,
  eyebrow,
  title,
  description,
  isActive,
  isComplete,
  isDisabled,
  children,
}: BookingStepShellProps) => (
  <section
    id={id}
    className={cn(
      "scroll-mt-24 rounded-lg border bg-zinc-900/55 p-4 shadow-sm transition-colors sm:p-5",
      isActive ? "border-brand-hover/55" : "border-zinc-800",
      isDisabled && "opacity-70",
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-100/85">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-bold leading-tight text-zinc-50 sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
      <BookingStepStatus isActive={isActive} isComplete={isComplete} />
    </div>

    <div className="mt-5">{children}</div>
  </section>
)

export const BookingFlowProgress = ({ steps }: BookingFlowProgressProps) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
              step.isComplete
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                : step.isActive
                  ? "border-brand-hover bg-brand text-white"
                  : "border-zinc-700 bg-zinc-900 text-zinc-500",
            )}
          >
            {step.isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          <span
            className={cn(
              "hidden min-w-0 truncate text-xs font-semibold sm:block",
              step.isActive || step.isComplete ? "text-zinc-100" : "text-zinc-500",
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span
              className={cn(
                "h-px flex-1 rounded-full",
                step.isComplete ? "bg-emerald-500/45" : "bg-zinc-800",
              )}
            />
          )}
        </div>
      ))}
    </div>
  </div>
)

export const BookingSummaryRow = ({
  label,
  value,
  isReady,
  compact,
}: BookingSummaryRowProps) => (
  <div
    className={cn(
      "flex items-start justify-between gap-4 border-b border-zinc-800/80 last:border-b-0",
      compact ? "py-2" : "py-3",
    )}
  >
    <span className={cn("text-zinc-500", compact ? "text-xs" : "text-sm")}>{label}</span>
    <span
      className={cn(
        "min-w-0 text-right font-semibold",
        compact ? "text-xs" : "text-sm",
        isReady ? "text-zinc-100" : "text-zinc-500",
      )}
    >
      {value}
    </span>
  </div>
)
