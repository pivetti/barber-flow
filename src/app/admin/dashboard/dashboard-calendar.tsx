"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDays, Pencil } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition, type Dispatch } from "react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import BookingCardActions from "./booking-card-actions"
import type { OptimisticStatusChangePayload } from "./booking-card-actions"
import { getAdminDashboardMonthBookings } from "@/features/admin/actions/dashboard"

interface DashboardBooking {
  id: string
  dateKey: string
  time: string
  endTime: string
  startsAtIso: string
  endsAtIso: string
  status: string
  cancellationRequested: boolean
  customerName: string
  customerPhone: string
  serviceName: string
}

interface AdminDashboardCalendarProps {
  bookings: DashboardBooking[]
  initialDateKey: string
  todayKey: string
  initialNowIso: string
}

const statusLabelMap: Record<string, string> = {
  SCHEDULED: "Agendado",
  DONE: "Concluido",
  CANCELED: "Cancelado",
}

const getStatusLabel = (status: string, cancellationRequested: boolean) => {
  if (cancellationRequested && status === "SCHEDULED") {
    return "Cancelamento solicitado"
  }

  return statusLabelMap[status] ?? status
}

const getStatusClassName = (status: string, cancellationRequested: boolean) => {
  if (cancellationRequested && status === "SCHEDULED") {
    return "border-amber-500/35 bg-amber-500/14 text-amber-300"
  }

  if (status === "DONE") {
    return "border-emerald-500/35 bg-emerald-500/14 text-emerald-300"
  }

  if (status === "CANCELED") {
    return "border-red-500/35 bg-red-500/14 text-red-300"
  }

  return "border-brand/40 bg-brand/16 text-brand-100"
}

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const getDateKey = (date: Date) => format(date, "yyyy-MM-dd")

type DashboardBookingSectionId = "inProgress" | "upcoming" | "completed"

const getTemporalStatusLabel = (
  booking: DashboardBooking,
  sectionId: DashboardBookingSectionId,
) => {
  if (sectionId === "inProgress" && booking.status === "SCHEDULED") {
    return "Em atendimento"
  }

  if (sectionId === "completed" && booking.status === "SCHEDULED") {
    return "Encerrado"
  }

  return getStatusLabel(booking.status, booking.cancellationRequested)
}

const getTemporalStatusClassName = (
  booking: DashboardBooking,
  sectionId: DashboardBookingSectionId,
) => {
  if (sectionId === "inProgress" && booking.status === "SCHEDULED") {
    return "border-emerald-500/40 bg-emerald-500/14 text-emerald-300"
  }

  if (sectionId === "completed" && booking.status === "SCHEDULED") {
    return "border-amber-500/35 bg-amber-500/12 text-amber-300"
  }

  return getStatusClassName(booking.status, booking.cancellationRequested)
}

const sortBookingsByStart = (left: DashboardBooking, right: DashboardBooking) =>
  left.startsAtIso.localeCompare(right.startsAtIso)

const BookingCard = ({
  booking,
  sectionId,
  onOptimisticStatusChange,
  onStatusChangeError,
  onStatusChangeSuccess,
}: {
  booking: DashboardBooking
  sectionId: DashboardBookingSectionId
  onOptimisticStatusChange: Dispatch<OptimisticStatusChangePayload>
  onStatusChangeError: Dispatch<string>
  onStatusChangeSuccess: Dispatch<string>
}) => {
  const statusLabel = getTemporalStatusLabel(booking, sectionId)

  return (
    <article
      className={cn(
        "rounded-2xl border bg-gradient-to-b p-3.5 shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)] sm:p-4",
        sectionId === "inProgress"
          ? "border-emerald-500/35 from-emerald-950/35 to-zinc-950/80 hover:border-emerald-400/45"
          : sectionId === "completed"
            ? "border-zinc-800/55 from-zinc-900/55 to-zinc-950/70 opacity-85 hover:border-zinc-700/70 max-sm:opacity-75"
            : "border-zinc-800/70 from-zinc-900/80 to-zinc-950/75 hover:border-brand/30",
      )}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="shrink-0">
            <p
              className={cn(
                "inline-flex h-9 min-w-[72px] items-center justify-center rounded-xl border px-2 text-[17px] font-semibold leading-none",
                sectionId === "completed"
                  ? "border-zinc-700/70 bg-zinc-900/70 text-zinc-300"
                  : "border-brand/30 bg-brand/10 text-brand-100",
              )}
            >
              {booking.time}
            </p>
            <p className="mt-1 text-center text-[10px] font-medium text-zinc-500">
              ate {booking.endTime}
            </p>
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1.5">
            <span
              title={statusLabel}
              className={cn(
                "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                "max-w-[150px] items-center justify-center text-center leading-tight",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                getTemporalStatusClassName(booking, sectionId),
                booking.cancellationRequested && booking.status === "SCHEDULED"
                  ? "whitespace-normal text-[9px]"
                  : "whitespace-nowrap",
              )}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-semibold leading-tight tracking-tight text-zinc-100">
              {booking.customerName}
            </p>
            <p className="mt-0.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-tight text-zinc-300/90">
              {booking.serviceName}
            </p>
          </div>

          <Link
            href={`/admin/bookings/${booking.id}`}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-brand/35 bg-brand/12 px-2.5 text-[11px] font-semibold text-brand-100 transition-colors hover:bg-brand/25"
          >
            <Pencil className="h-3 w-3 shrink-0" />
            Editar
          </Link>
        </div>

        <div className="flex border-t border-zinc-800/70 pt-2.5">
          <BookingCardActions
            bookingId={booking.id}
            customerName={booking.customerName}
            customerPhone={booking.customerPhone}
            onOptimisticStatusChange={onOptimisticStatusChange}
            onStatusChangeError={onStatusChangeError}
            onStatusChangeSuccess={onStatusChangeSuccess}
          />
        </div>
      </div>
    </article>
  )
}

const BookingSection = ({
  title,
  description,
  bookings,
  sectionId,
  compact,
  onOptimisticStatusChange,
  onStatusChangeError,
  onStatusChangeSuccess,
}: {
  title: string
  description?: string
  bookings: DashboardBooking[]
  sectionId: DashboardBookingSectionId
  compact?: boolean
  onOptimisticStatusChange: Dispatch<OptimisticStatusChangePayload>
  onStatusChangeError: Dispatch<string>
  onStatusChangeSuccess: Dispatch<string>
}) => {
  if (bookings.length === 0) {
    return null
  }

  return (
    <section className={cn(compact && "rounded-2xl border border-zinc-800/50 bg-zinc-950/25 p-3 sm:p-4")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={cn(
              "text-sm font-semibold text-zinc-100",
              compact && "text-xs uppercase tracking-[0.12em] text-zinc-400",
            )}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
          )}
        </div>
        <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 text-xs font-semibold text-zinc-300">
          {bookings.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2 2xl:grid-cols-3">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            sectionId={sectionId}
            onOptimisticStatusChange={onOptimisticStatusChange}
            onStatusChangeError={onStatusChangeError}
            onStatusChangeSuccess={onStatusChangeSuccess}
          />
        ))}
      </div>
    </section>
  )
}

const AdminDashboardCalendar = ({
  bookings,
  initialDateKey,
  todayKey,
  initialNowIso,
}: AdminDashboardCalendarProps) => {
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey)
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(initialDateKey))
  const [monthBookings, setMonthBookings] = useState(bookings)
  const [loadError, setLoadError] = useState("")
  const [currentTimeMs, setCurrentTimeMs] = useState(() =>
    new Date(initialNowIso).getTime(),
  )
  const statusRollbackBookingsRef = useRef(new Map<string, DashboardBooking>())
  const [, startTransition] = useTransition()
  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey])
  const today = useMemo(() => parseDateKey(todayKey), [todayKey])
  const visibleMonthBookings = useMemo(
    () => monthBookings.filter((booking) => booking.status !== "CANCELED"),
    [monthBookings],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, 60 * 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const bookingCountByDate = useMemo(() => {
    return visibleMonthBookings.reduce<Record<string, number>>((result, booking) => {
      result[booking.dateKey] = (result[booking.dateKey] ?? 0) + 1
      return result
    }, {})
  }, [visibleMonthBookings])

  const bookedDays = useMemo(
    () => Object.keys(bookingCountByDate).map(parseDateKey),
    [bookingCountByDate],
  )

  const selectedBookings = useMemo(
    () =>
      visibleMonthBookings
        .filter((booking) => booking.dateKey === selectedDateKey)
        .sort(sortBookingsByStart),
    [visibleMonthBookings, selectedDateKey],
  )

  const selectedBookingGroups = useMemo(() => {
    const inProgress: DashboardBooking[] = []
    const upcoming: DashboardBooking[] = []
    const completed: DashboardBooking[] = []

    for (const booking of selectedBookings) {
      const startsAtMs = new Date(booking.startsAtIso).getTime()
      const endsAtMs = new Date(booking.endsAtIso).getTime()

      if (booking.status === "SCHEDULED" && startsAtMs <= currentTimeMs && endsAtMs > currentTimeMs) {
        inProgress.push(booking)
        continue
      }

      if (booking.status === "SCHEDULED" && startsAtMs > currentTimeMs) {
        upcoming.push(booking)
        continue
      }

      if (booking.status === "DONE" || (booking.status === "SCHEDULED" && endsAtMs <= currentTimeMs)) {
        completed.push(booking)
      }
    }

    return {
      inProgress: inProgress.sort(sortBookingsByStart),
      upcoming: upcoming.sort(sortBookingsByStart),
      completed: completed.sort(sortBookingsByStart),
    }
  }, [currentTimeMs, selectedBookings])

  const selectedDateLabel =
    selectedDateKey === todayKey
      ? `Hoje - ${format(selectedDate, "dd MMM", { locale: ptBR })}`
      : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })

  const loadMonth = (month: Date) => {
    const nextDateKey = getDateKey(month)

    statusRollbackBookingsRef.current.clear()
    setVisibleMonth(month)
    setSelectedDateKey(nextDateKey)
    setLoadError("")

    startTransition(async () => {
      try {
        const nextBookings = await getAdminDashboardMonthBookings(nextDateKey)
        setMonthBookings(nextBookings)
      } catch {
        setMonthBookings([])
        setLoadError("Nao foi possivel carregar este mes agora.")
      }
    })
  }

  const handleTodayClick = () => {
    const visibleMonthKey = format(visibleMonth, "yyyy-MM")
    const todayMonthKey = format(today, "yyyy-MM")

    if (visibleMonthKey === todayMonthKey) {
      setSelectedDateKey(todayKey)
      return
    }

    loadMonth(today)
  }

  const handleOptimisticStatusChange = ({
    bookingId,
    status,
  }: OptimisticStatusChangePayload) => {
    setMonthBookings((currentBookings) => {
      const previousBooking = currentBookings.find((booking) => booking.id === bookingId)

      if (previousBooking) {
        statusRollbackBookingsRef.current.set(bookingId, previousBooking)
      }

      return currentBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status,
              cancellationRequested: false,
            }
          : booking,
      )
    })
  }

  const handleStatusChangeSuccess = (bookingId: string) => {
    statusRollbackBookingsRef.current.delete(bookingId)
  }

  const handleStatusChangeError = (bookingId: string) => {
    const bookingToRestore = statusRollbackBookingsRef.current.get(bookingId)

    statusRollbackBookingsRef.current.delete(bookingId)

    if (!bookingToRestore) {
      return
    }

    setMonthBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingToRestore.id ? bookingToRestore : booking,
      ),
    )
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.10),transparent_44%),linear-gradient(to_bottom,rgba(24,24,27,0.94),rgba(9,9,11,0.90))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.26)] sm:p-5 lg:sticky lg:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/75">
              Calendario
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">Escolha o dia</h2>
          </div>

          <button
            type="button"
            onClick={handleTodayClick}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-brand/35 bg-brand/15 px-3 text-xs font-semibold text-brand-100 transition-all hover:bg-brand/25"
          >
            Hoje
          </button>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              setSelectedDateKey(getDateKey(date))
            }
          }}
          month={visibleMonth}
          onMonthChange={loadMonth}
          showOutsideDays={false}
          locale={ptBR}
          modifiers={{
            hasBookings: bookedDays,
          }}
          modifiersClassNames={{
            hasBookings:
              "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-brand-100",
          }}
          className="mx-auto mt-4 w-fit rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-3"
          classNames={{
            caption_label: "text-sm font-semibold capitalize text-zinc-100",
            head_cell: "w-9 rounded-md text-[0.75rem] font-medium text-zinc-500",
            day: "h-9 w-9 rounded-xl p-0 text-sm font-medium text-zinc-200 hover:bg-brand/15 hover:text-brand-100",
            day_selected:
              "bg-brand text-white hover:bg-brand-hover hover:text-white focus:bg-brand focus:text-white",
            day_today: "border border-brand/40 bg-brand/10 text-brand-100",
            day_outside: "text-zinc-700 opacity-60",
            nav_button:
              "h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-900/80 p-0 text-zinc-200 opacity-80 hover:bg-zinc-800 hover:opacity-100",
          }}
        />

        {loadError && (
          <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {loadError}
          </p>
        )}
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/35 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/75">
              Agendamentos
            </p>
            <h2 className="truncate text-base font-semibold capitalize text-zinc-50">
              {selectedDateLabel}
            </h2>
          </div>
          <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-300">
            <CalendarDays className="h-4 w-4 text-brand-100" />
            {selectedBookings.length}
          </span>
        </div>

        {selectedBookings.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/85 to-zinc-950/80 px-4 py-12 text-center">
            <p className="text-sm font-medium text-zinc-300">Nenhum agendamento para esta data.</p>
            <p className="mt-1 text-xs text-zinc-500">Escolha outro dia no calendario mensal.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <BookingSection
              title="Em atendimento"
              description="Agendamentos em andamento neste momento."
              bookings={selectedBookingGroups.inProgress}
              sectionId="inProgress"
              onOptimisticStatusChange={handleOptimisticStatusChange}
              onStatusChangeError={handleStatusChangeError}
              onStatusChangeSuccess={handleStatusChangeSuccess}
            />

            <BookingSection
              title="Proximos"
              description="Horarios ainda por vir, ordenados pelo inicio."
              bookings={selectedBookingGroups.upcoming}
              sectionId="upcoming"
              onOptimisticStatusChange={handleOptimisticStatusChange}
              onStatusChangeError={handleStatusChangeError}
              onStatusChangeSuccess={handleStatusChangeSuccess}
            />

            <BookingSection
              title={selectedDateKey === todayKey ? "Encerrados hoje" : "Encerrados do dia"}
              description="Atendimentos concluidos ou ja encerrados que seguem no historico."
              bookings={selectedBookingGroups.completed}
              sectionId="completed"
              compact
              onOptimisticStatusChange={handleOptimisticStatusChange}
              onStatusChangeError={handleStatusChangeError}
              onStatusChangeSuccess={handleStatusChangeSuccess}
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboardCalendar
