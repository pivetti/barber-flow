"use client"

import {
  CalendarDays,
  Clock3,
  Phone,
  Scissors,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CustomerBookingSummaryIcon =
  | "customer"
  | "phone"
  | "service"
  | "barber"
  | "date"
  | "time"
  | "status"

export interface CustomerBookingSummaryItemData {
  icon: CustomerBookingSummaryIcon
  label: string
  value: string
}

interface CustomerBookingSummaryGridProps {
  items: CustomerBookingSummaryItemData[]
  className?: string
  compact?: boolean
}

const iconMap: Record<CustomerBookingSummaryIcon, LucideIcon> = {
  customer: UserRound,
  phone: Phone,
  service: Scissors,
  barber: UserRound,
  date: CalendarDays,
  time: Clock3,
  status: ShieldCheck,
}

const CustomerBookingSummaryItem = ({
  item,
  compact,
}: {
  item: CustomerBookingSummaryItemData
  compact?: boolean
}) => {
  const Icon = iconMap[item.icon]

  return (
    <div
      className={cn(
        "flex items-start rounded-xl bg-zinc-950/45",
        compact ? "gap-2 px-2.5 py-2.5" : "gap-3 px-3 py-3",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-brand-100",
          compact ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold uppercase text-zinc-500",
            compact ? "text-[9px] tracking-[0.12em]" : "text-[10px] tracking-[0.14em]",
          )}
        >
          {item.label}
        </p>
        <p
          className={cn(
            "mt-1 break-words font-semibold text-zinc-100",
            compact ? "text-[13px] leading-snug" : "text-sm",
          )}
        >
          {item.value}
        </p>
      </div>
    </div>
  )
}

export const CustomerBookingSummaryGrid = ({
  items,
  className,
  compact,
}: CustomerBookingSummaryGridProps) => (
  <div className={cn("grid gap-2 sm:grid-cols-2", compact && "grid-cols-2", className)}>
    {items.map((item) => (
      <CustomerBookingSummaryItem
        key={`${item.label}-${item.value}`}
        item={item}
        compact={compact}
      />
    ))}
  </div>
)

export const getCustomerBookingStatusLabel = ({
  status,
  cancellationRequested,
}: {
  status: string
  cancellationRequested?: boolean
}) => {
  if (cancellationRequested && status === "SCHEDULED") {
    return "Cancelamento solicitado"
  }

  if (status === "SCHEDULED") return "Agendado"
  if (status === "DONE") return "Concluido"
  if (status === "CANCELED") return "Cancelado"
  return status
}
