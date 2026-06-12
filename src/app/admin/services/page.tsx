import Link from "next/link"
import AdminHeader from "@/features/admin/components/admin-header"
import { canManageServices } from "@/lib/admin-permissions"
import { getBrasiliaTodayStart, toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import ServicesManagerClient from "./services-manager-client"

interface ServicesAdminPageProps {
  searchParams?: {
    deleteErrorServiceId?: string
  }
}

const ServicesAdminPage = async ({ searchParams }: ServicesAdminPageProps) => {
  const admin = await requireAdmin()

  if (!canManageServices(admin.role)) {
    redirect("/admin/dashboard")
  }

  const services = await db.service.findMany({
    orderBy: {
      name: "asc",
    },
  })
  const serializedServices = services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    imageUrl: service.imageUrl,
    price: service.price.toString(),
  }))

  const deleteErrorServiceId = searchParams?.deleteErrorServiceId?.trim()
  const todayStart = getBrasiliaTodayStart()

  const blockedService = deleteErrorServiceId
    ? await db.service.findUnique({
        where: {
          id: deleteErrorServiceId,
        },
        select: {
          id: true,
          name: true,
          bookings: {
            select: {
              id: true,
              customerName: true,
              date: true,
            },
            where: {
              status: "SCHEDULED",
              date: {
                gte: todayStart,
              },
            },
            orderBy: {
              date: "asc",
            },
            take: 5,
          },
        },
      })
    : null

  const blockedBookingCount = blockedService
    ? await db.booking.count({
        where: {
          serviceId: blockedService.id,
          status: "SCHEDULED",
          date: {
            gte: todayStart,
          },
        },
      })
    : 0

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Servicos</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Gestao de servicos</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Crie, edite e exclua servicos mantendo o catalogo sempre atualizado para os agendamentos.
            </p>
          </div>
        </section>

        {blockedService && blockedBookingCount > 0 && (
          <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
            <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold">Nao foi possivel excluir o servico {blockedService.name}.</p>
              <p className="mt-1 text-amber-100/80">
                Exclua primeiro os agendamentos agendados de hoje ou futuros vinculados a este servico e tente novamente.
              </p>
              <div className="mt-3 space-y-2">
                {blockedService.bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-zinc-950/35 px-3 py-2 text-xs text-amber-50 transition-colors hover:bg-zinc-900/60"
                  >
                    <span className="min-w-0 truncate font-medium">{booking.customerName}</span>
                    <span className="shrink-0 text-amber-100/75">
                      {format(toBrasiliaWallClock(booking.date), "dd/MM HH:mm")}
                    </span>
                  </Link>
                ))}
              </div>
              {blockedBookingCount > blockedService.bookings.length && (
                <p className="mt-3 text-xs text-amber-100/75">
                  Existem mais {blockedBookingCount - blockedService.bookings.length} agendamento(s) futuros vinculados.
                </p>
              )}
            </div>
          </section>
        )}

        <ServicesManagerClient initialServices={serializedServices} />
      </main>
    </>
  )
}

export default ServicesAdminPage
