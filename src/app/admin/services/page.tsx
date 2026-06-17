import AdminHeader from "@/features/admin/components/admin-header"
import { canManageServices } from "@/lib/admin-permissions"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { redirect } from "next/navigation"
import ServicesManagerClient from "./services-manager-client"

const ServicesAdminPage = async () => {
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
    durationMinutes: String(service.durationMinutes),
    isActive: service.isActive,
  }))

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgb(var(--brand-background-rgb)_/_0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Servicos</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Gestao de servicos</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Crie, edite e exclua servicos mantendo o catalogo sempre atualizado para os agendamentos.
            </p>
          </div>
        </section>

        <ServicesManagerClient initialServices={serializedServices} />
      </main>
    </>
  )
}

export default ServicesAdminPage
