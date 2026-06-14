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
}: {
  item: CustomerBookingSummaryItemData
}) => {
  const Icon = iconMap[item.icon]

  return (
    <div className="flex items-start gap-3 rounded-xl bg-zinc-950/45 px-3 py-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-brand-100">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {item.label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-zinc-100">{item.value}</p>
      </div>
    </div>
  )
}

export const CustomerBookingSummaryGrid = ({
  items,
  className,
}: CustomerBookingSummaryGridProps) => (
  <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
    {items.map((item) => (
      <CustomerBookingSummaryItem key={`${item.label}-${item.value}`} item={item} />
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
