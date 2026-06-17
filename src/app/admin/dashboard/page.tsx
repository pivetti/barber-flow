import { format } from "date-fns"
import { redirect } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { canManageBookings } from "@/lib/admin-permissions"
import {
  createUtcDateFromBrasiliaParts,
  getBrasiliaTodayStart,
  toBrasiliaWallClock,
} from "@/lib/brasilia-time"
import { requireAdmin } from "@/lib/require-admin"
import AdminDashboardCalendar from "./dashboard-calendar"
import { getDashboardMonthBookings } from "./get-dashboard-month-bookings"

interface DashboardPageProps {
  searchParams?: {
    date?: string
  }
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
  const today = getBrasiliaTodayStart()
  const initialDateKey = format(toBrasiliaWallClock(selectedDate), "yyyy-MM-dd")
  const todayKey = format(toBrasiliaWallClock(today), "yyyy-MM-dd")

  const bookings = await getDashboardMonthBookings({
    barberId: admin.id,
    dateKey: initialDateKey,
  })

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgb(var(--brand-background-rgb)_/_0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Painel</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Agenda</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Selecione um dia no calendario mensal e acompanhe os agendamentos sem recarregar a tela a cada clique.
            </p>
          </div>
        </section>

        <AdminDashboardCalendar
          bookings={bookings}
          initialDateKey={initialDateKey}
          todayKey={todayKey}
          initialNowIso={new Date().toISOString()}
        />

        <footer className="mt-5 rounded-2xl border border-zinc-800/55 bg-zinc-950/35 px-4 py-3 text-xs text-zinc-500 sm:mt-6">
          A troca de dias acontece direto no calendario. As acoes dos cards continuam atualizando a agenda do painel.
        </footer>
      </main>
    </>
  )
}

export default DashboardPage
