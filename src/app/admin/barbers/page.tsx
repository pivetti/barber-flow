import Link from "next/link"
import AdminHeader from "@/features/admin/components/admin-header"
import { changeBarberRole, toggleBarberStatus } from "@/features/admin/actions/barbers"
import { Button } from "@/components/ui/button"
import {
  canEditBarber,
  canChangeBarberRole,
  canManageBarbers,
  canToggleBarberStatus,
} from "@/lib/admin-permissions"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { redirect } from "next/navigation"

const roleLabelMap = {
  OWNER: "Owner",
  ADMIN: "Admin",
  BARBER: "Barber",
} as const

const BarbersAdminPage = async () => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    redirect("/admin/dashboard")
  }

  const barbers = await db.barber.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
    },
  })

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Gestao</p>
              <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Barbeiros</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
                Gerencie usuarios barbeiros, permissoes e status de acesso ao painel.
              </p>
            </div>

            <Link
              href="/admin/barbers/new"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand/35 bg-brand/15 px-4 text-sm font-semibold text-brand-100 transition-colors hover:bg-brand/25"
            >
              Novo barbeiro
            </Link>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          <div className="space-y-3">
            {barbers.map((barber) => {
              const canEdit = canEditBarber(admin, barber.role)
              const canToggle = canToggleBarberStatus(admin, barber.role, barber.id)
              const canPromoteToAdmin = canChangeBarberRole(admin, barber.role, "ADMIN")
              const canDemoteToBarber = canChangeBarberRole(admin, barber.role, "BARBER")

              return (
                <article
                  key={barber.id}
                  className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-zinc-100">{barber.name}</p>
                      <p className="text-sm text-zinc-400">{barber.email ?? "Sem e-mail"}</p>
                      <p className="text-sm text-zinc-400">{barber.phone ?? "Sem telefone"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-700/80 bg-zinc-900/85 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                        {roleLabelMap[barber.role]}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
                          barber.isActive
                            ? "border-emerald-500/35 bg-emerald-500/14 text-emerald-300"
                            : "border-zinc-700/80 bg-zinc-900/85 text-zinc-400"
                        }`}
                      >
                        {barber.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-nowrap items-center justify-start gap-1.5 sm:gap-2">
                    {canEdit && (
                      <Link
                        href={`/admin/barbers/${barber.id}/edit`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 sm:text-sm"
                      >
                        Editar
                      </Link>
                    )}

                    {canToggle && (
                      <form action={toggleBarberStatus}>
                        <input type="hidden" name="barberId" value={barber.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          className="h-10 rounded-xl border-zinc-700/80 bg-zinc-900/85 px-4 text-xs text-zinc-100 hover:bg-zinc-800 sm:text-sm"
                        >
                          {barber.isActive ? "Inativar" : "Ativar"}
                        </Button>
                      </form>
                    )}

                    {canPromoteToAdmin && barber.role !== "ADMIN" && (
                      <form action={changeBarberRole}>
                        <input type="hidden" name="barberId" value={barber.id} />
                        <input type="hidden" name="role" value="ADMIN" />
                        <Button
                          type="submit"
                          variant="outline"
                          className="h-10 rounded-xl border-zinc-700/80 bg-zinc-900/85 px-4 text-xs text-zinc-100 hover:bg-zinc-800 sm:text-sm"
                        >
                          Tornar admin
                        </Button>
                      </form>
                    )}

                    {canDemoteToBarber && barber.role === "ADMIN" && (
                      <form action={changeBarberRole}>
                        <input type="hidden" name="barberId" value={barber.id} />
                        <input type="hidden" name="role" value="BARBER" />
                        <Button
                          type="submit"
                          variant="outline"
                          className="h-10 rounded-xl border-zinc-700/80 bg-zinc-900/85 px-4 text-xs text-zinc-100 hover:bg-zinc-800 sm:text-sm"
                        >
                          Remover admin
                        </Button>
                      </form>
                    )}

                  </div>
                </article>
              )
            })}

            {barbers.length === 0 && (
              <p className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 text-sm text-zinc-400">
                Nenhum barbeiro cadastrado.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default BarbersAdminPage
