import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Ban, CheckCircle2, Phone, Scissors, Trash2, User } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { cancelAdminBooking, concludeAdminBooking, deleteAdminBooking } from "@/features/admin/actions/bookings"
import { Button } from "@/components/ui/button"
import { canManageBookings } from "@/lib/admin-permissions"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { cn } from "@/lib/utils"

interface BookingDetailPageProps {
  params: {
    bookingId: string
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

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 10) {
    return digits.replace(/^([0-9]{0,2})([0-9]{0,4})([0-9]{0,4}).*/, (_, ddd, firstPart, secondPart) => {
      if (!ddd) return ""
      if (!firstPart) return `(${ddd}`
      if (!secondPart) return `(${ddd}) ${firstPart}`
      return `(${ddd}) ${firstPart}-${secondPart}`
    })
  }

  return digits.replace(/^([0-9]{2})([0-9]{5})([0-9]{4}).*/, "($1) $2-$3")
}

const editButtonClassName =
  "inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/85 px-2.5 py-1 text-xs font-semibold text-zinc-200 transition-colors hover:border-violet-500/35 hover:bg-zinc-800 hover:text-zinc-100"

const BookingDetailPage = async ({ params }: BookingDetailPageProps) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    notFound()
  }

  const booking = await db.booking.findFirst({
    where: {
      id: params.bookingId,
      barberId: admin.id,
    },
    include: {
      service: true,
      barber: true,
    },
  })

  if (!booking) {
    notFound()
  }

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/75">Agendamento</p>
              <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Gerenciar registro</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
                Visualize os detalhes do agendamento e atualize o status de forma rapida.
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-violet-500/40 hover:bg-zinc-800 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para dashboard
            </Link>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <article className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Cliente</p>
                  <Link href={`/admin/bookings/${booking.id}/edit?field=client`} className={editButtonClassName}>
                    Editar
                  </Link>
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl border border-zinc-800/70 bg-zinc-900/80 p-2">
                    <User className="h-4 w-4 text-zinc-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xl font-semibold leading-tight text-zinc-100 sm:text-2xl">{booking.customerName}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                      <Phone className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="break-all">{formatPhone(booking.customerPhone)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Servico</p>
                  <Link href={`/admin/bookings/${booking.id}/edit?field=service`} className={editButtonClassName}>
                    Editar
                  </Link>
                </div>

                <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-sm font-medium text-zinc-100 sm:text-base">
                  <Scissors className="h-4 w-4 shrink-0 text-zinc-300" />
                  <span className="break-words">{booking.service.name}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Horario</p>
                  <Link href={`/admin/bookings/${booking.id}/edit?field=time`} className={editButtonClassName}>
                    Editar
                  </Link>
                </div>

                <p className="mt-3 inline-flex h-11 min-w-[94px] items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 text-2xl font-semibold leading-none text-violet-100 sm:text-3xl">
                  {format(toBrasiliaWallClock(booking.date), "HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Data</p>
                  <Link href={`/admin/bookings/${booking.id}/edit?field=date`} className={editButtonClassName}>
                    Editar
                  </Link>
                </div>

                <p className="mt-3 text-base font-semibold text-zinc-100 sm:text-lg">
                  {format(toBrasiliaWallClock(booking.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Status</p>

                <div className="mt-3">
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:text-sm",
                      getStatusClassName(booking.status, booking.cancellationRequested),
                    )}
                  >
                    {getStatusLabel(booking.status, booking.cancellationRequested)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Acoes</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <form action={concludeAdminBooking} className="w-full">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="returnTo" value={`/admin/bookings/${booking.id}`} />
                  <Button type="submit" size="sm" variant="default" className="h-11 w-full rounded-xl text-sm font-semibold">
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Concluir
                  </Button>
                </form>

                <form action={cancelAdminBooking} className="w-full">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="returnTo" value={`/admin/bookings/${booking.id}`} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-zinc-700/80 bg-zinc-900/85 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
                  >
                    <Ban className="mr-1 h-4 w-4" />
                    Cancelar
                  </Button>
                </form>

                <form action={deleteAdminBooking} className="w-full sm:col-span-2 xl:col-span-1">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="returnTo" value="/admin/dashboard" />
                  <Button type="submit" size="sm" variant="destructive" className="h-11 w-full rounded-xl text-sm font-semibold">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Excluir
                  </Button>
                </form>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  )
}

export default BookingDetailPage
