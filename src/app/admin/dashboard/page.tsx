import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import Link from "next/link"
import AdminHeader from "@/features/admin/components/admin-header"
import BookingCardActions from "./booking-card-actions"
import { canManageBookings } from "@/lib/admin-permissions"
import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaEndOfDay,
  getBrasiliaStartOfDay,
  getBrasiliaTodayStart,
  isSameBrasiliaDay,
  toBrasiliaWallClock,
} from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { cn } from "@/lib/utils"
import { redirect } from "next/navigation"

interface DashboardPageProps {
  searchParams?: {
    date?: string
  }
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

  return "border-violet-500/40 bg-violet-500/16 text-violet-100"
}

const getSelectedDate = (dateParam?: string) => {
  if (!dateParam) {
    return getBrasiliaTodayStart()
  }

  const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return getBrasiliaTodayStart()
  }

  return createUtcDateFromBrasiliaParts(Number(match[1]), Number(match[2]), Number(match[3]))
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const admin = await requireAdmin()

  if (!canManageBookings(admin.role)) {
    redirect("/admin/login")
  }

  const selectedDate = getSelectedDate(searchParams?.date)
  const previousDate = addDays(selectedDate, -1)
  const nextDate = addDays(selectedDate, 1)
  const today = getBrasiliaTodayStart()

  const bookings = await db.booking.findMany({
    where: {
      barberId: admin.id,
      date: {
        gte: getBrasiliaStartOfDay(selectedDate),
        lte: getBrasiliaEndOfDay(selectedDate),
      },
    },
    select: {
      id: true,
      date: true,
      status: true,
      cancellationRequested: true,
      customerName: true,
      service: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  })

  const selectedDateLabel = isSameBrasiliaDay(selectedDate, today)
    ? `Hoje - ${format(toBrasiliaWallClock(selectedDate), "dd MMM", { locale: ptBR })}`
    : format(toBrasiliaWallClock(selectedDate), "dd MMM", { locale: ptBR })

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/75">Painel</p>
              <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Agenda</h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-400/95">
                Visualize e acompanhe os agendamentos por dia com mais clareza.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center rounded-2xl border border-zinc-800/60 bg-zinc-950/55 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <div className="flex w-full max-w-md items-center justify-center gap-1.5 sm:gap-2">
              <Link
                href={`/admin/dashboard?date=${format(toBrasiliaWallClock(previousDate), "yyyy-MM-dd")}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 text-sm font-semibold text-zinc-200 transition-all hover:border-violet-500/40 hover:bg-zinc-800 hover:text-zinc-100 sm:h-10 sm:w-10"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>

              <div className="inline-flex h-9 min-w-[132px] items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm font-semibold text-zinc-100 sm:h-10 sm:min-w-[152px] sm:px-4">
                <span className={cn("capitalize", !isSameBrasiliaDay(selectedDate, today) && "text-zinc-200")}>{selectedDateLabel}</span>
              </div>

              {!isSameBrasiliaDay(selectedDate, today) && (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 transition-all hover:bg-violet-500/25 sm:h-10 sm:px-4 sm:text-sm"
                >
                  Hoje
                </Link>
              )}

              <Link
                href={`/admin/dashboard?date=${format(toBrasiliaWallClock(nextDate), "yyyy-MM-dd")}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 text-sm font-semibold text-zinc-200 transition-all hover:border-violet-500/40 hover:bg-zinc-800 hover:text-zinc-100 sm:h-10 sm:w-10"
                aria-label="Proximo dia"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/85 to-zinc-950/80 px-4 py-12 text-center">
              <p className="text-sm font-medium text-zinc-300">Nenhum agendamento para esta data.</p>
              <p className="mt-1 text-xs text-zinc-500">Use os botoes acima para navegar entre os dias.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-3.5 shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)] sm:p-4"
                >
                  <div className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <p className="inline-flex h-9 min-w-[72px] shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-2 text-[17px] font-semibold leading-none text-violet-100">
                        {format(toBrasiliaWallClock(booking.date), "HH:mm")}
                      </p>

                      <div className="flex min-w-0 flex-col items-end gap-1.5">
                        <span
                          title={getStatusLabel(booking.status, booking.cancellationRequested)}
                          className={cn(
                            "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            "max-w-[150px] items-center justify-center text-center leading-tight",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                            getStatusClassName(booking.status, booking.cancellationRequested),
                            booking.cancellationRequested && booking.status === "SCHEDULED"
                              ? "text-[9px] whitespace-normal"
                              : "whitespace-nowrap",
                          )}
                        >
                          {getStatusLabel(booking.status, booking.cancellationRequested)}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-semibold leading-tight tracking-tight text-zinc-100">
                          {booking.customerName}
                        </p>
                        <p className="mt-0.5 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium leading-tight text-zinc-300/90">
                          {booking.service.name}
                        </p>
                      </div>

                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border border-violet-500/35 bg-violet-500/12 px-2.5 text-[11px] font-semibold text-violet-100 transition-colors hover:bg-violet-500/25"
                      >
                        <Pencil className="h-3 w-3 shrink-0" />
                        Editar
                      </Link>
                    </div>

                    <div className="flex border-t border-zinc-800/70 pt-2.5">
                      <BookingCardActions bookingId={booking.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-5 rounded-2xl border border-zinc-800/55 bg-zinc-950/35 px-4 py-3 text-xs text-zinc-500 sm:mt-6">
          Agenda atualizada em tempo real conforme novos agendamentos e alteracoes de status.
        </footer>
      </main>
    </>
  )
}

export default DashboardPage
