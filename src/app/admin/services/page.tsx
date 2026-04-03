import Link from "next/link"
import AdminHeader from "@/features/admin/components/admin-header"
import { createAdminService, deleteAdminService, updateAdminService } from "@/features/admin/actions/services"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canManageServices } from "@/lib/admin-permissions"
import { getBrasiliaTodayStart, toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { format } from "date-fns"
import { redirect } from "next/navigation"

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
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/75">Servicos</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Gestao de servicos</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Crie, edite e exclua servicos mantendo o catalogo sempre atualizado para os agendamentos.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] sm:p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Novo servico</h2>
            <form action={createAdminService} className="mt-4 grid gap-3 md:grid-cols-2">
              <Input name="name" placeholder="Nome" required className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100" />
              <Input
                name="price"
                placeholder="Preco (ex: 59.90)"
                required
                className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
              />
              <Input
                name="description"
                placeholder="Descricao (opcional)"
                className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
              />
              <Input
                name="imageUrl"
                placeholder="Imagem: corte.png ou /services/corte.png (opcional)"
                className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
              />
              <p className="text-xs text-zinc-500 md:col-span-2">
                Dica: coloque a imagem em `public/services` e informe apenas o nome do arquivo.
              </p>
              <Button
                type="submit"
                className="md:col-span-2 md:w-fit rounded-xl border border-violet-500/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
              >
                Criar servico
              </Button>
            </form>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          {blockedService && blockedBookingCount > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100">
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
          )}

          <div className="space-y-3">
            {services.map((service) => (
              <form
                key={service.id}
                action={updateAdminService}
                className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)]"
              >
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    name="name"
                    defaultValue={service.name}
                    required
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                  <Input
                    name="price"
                    defaultValue={String(service.price)}
                    required
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                  <Input
                    name="description"
                    defaultValue={service.description}
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
                  />
                  <Input
                    name="imageUrl"
                    defaultValue={service.imageUrl}
                    placeholder="Imagem: corte.png ou /services/corte.png"
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    className="rounded-xl border border-violet-500/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
                  >
                    Salvar
                  </Button>
                  <button
                    type="submit"
                    formAction={deleteAdminService}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/12 px-4 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20"
                  >
                    Excluir
                  </button>
                </div>
              </form>
            ))}

            {services.length === 0 && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 text-sm text-zinc-400">
                Nenhum servico cadastrado.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default ServicesAdminPage
