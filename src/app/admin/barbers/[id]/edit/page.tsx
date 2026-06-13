import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { deleteBarber, updateBarber } from "@/features/admin/actions/barbers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canDeleteBarber, canEditBarber, canManageBarbers } from "@/lib/admin-permissions"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

interface EditBarberPageProps {
  params: {
    id: string
  }
}

const EditBarberPage = async ({ params }: EditBarberPageProps) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    redirect("/admin/dashboard")
  }

  const barber = await db.barber.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      imageUrl: true,
      role: true,
      isActive: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  })

  if (!barber) {
    notFound()
  }

  if (!canEditBarber(admin, barber.role)) {
    redirect("/admin/barbers")
  }

  const canDelete = canDeleteBarber(admin, barber.role, barber.id)
  const bookingsCount = barber._count.bookings
  const shouldDeactivateToPreserveHistory = bookingsCount > 0
  const destructiveActionLabel = shouldDeactivateToPreserveHistory
    ? barber.isActive
      ? "Desativar barbeiro"
      : "Barbeiro inativo"
    : "Excluir barbeiro"

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Edicao</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Editar barbeiro</h1>
            <p className="text-sm leading-relaxed text-zinc-400/95">Atualize dados de acesso e perfil de {barber.name}.</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          <form action={updateBarber} className="grid gap-3 md:grid-cols-2 rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 sm:p-5">
            <input type="hidden" name="barberId" value={barber.id} />
            <Input
              name="name"
              defaultValue={barber.name}
              placeholder="Nome"
              required
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="email"
              type="email"
              defaultValue={barber.email ?? ""}
              placeholder="E-mail"
              required
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="phone"
              defaultValue={barber.phone ?? ""}
              placeholder="Telefone"
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="password"
              type="password"
              placeholder="Nova senha (opcional)"
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="imageUrl"
              defaultValue={barber.imageUrl}
              placeholder="Imagem: joao.png ou /barbers/joao.png"
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
            />
            <p className="text-xs text-zinc-500 md:col-span-2">
              Dica: coloque a imagem em `public/barbers` e informe apenas o nome do arquivo.
            </p>

            <div className="mt-2 flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" className="rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25">
                Salvar alteracoes
              </Button>
              <Link
                href="/admin/barbers"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                Voltar
              </Link>
            </div>
          </form>
        </section>

        {canDelete && (
          <section className="mt-5 rounded-3xl border border-red-500/20 bg-red-500/5 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
            <div className="rounded-2xl border border-red-500/20 bg-zinc-950/70 p-4 sm:p-5">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">Zona de risco</p>
                <h2 className="text-lg font-semibold text-zinc-50">
                  {shouldDeactivateToPreserveHistory ? "Desativar barbeiro" : "Excluir barbeiro"}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {shouldDeactivateToPreserveHistory
                    ? "Este barbeiro possui agendamentos vinculados. Para preservar o historico, ele sera desativado e deixara de aparecer no agendamento publico."
                    : "Este barbeiro nao possui agendamentos vinculados e pode ser removido permanentemente."}
                </p>
                {shouldDeactivateToPreserveHistory && (
                  <p className="text-xs font-medium text-amber-200">
                    {bookingsCount} agendamento(s) vinculado(s).
                  </p>
                )}
              </div>

              <form action={deleteBarber} className="mt-4">
                <input type="hidden" name="barberId" value={barber.id} />
                <Button
                  type="submit"
                  variant="destructive"
                  className="rounded-xl"
                  disabled={shouldDeactivateToPreserveHistory && !barber.isActive}
                >
                  {destructiveActionLabel}
                </Button>
              </form>
            </div>
          </section>
        )}
      </main>
    </>
  )
}

export default EditBarberPage
