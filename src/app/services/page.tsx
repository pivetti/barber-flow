import Link from "next/link"
import Header from "@/components/header"
import ServiceItem from "@/features/services/components/service-item"
import { idSchema } from "@/lib/input-validation"
import { db } from "@/lib/prisma"
import { getSafePublicImagePath } from "@/lib/safe-public-image"

interface ServicesPageProps {
  searchParams?: {
    barberId?: string
  }
}

export const dynamic = "force-dynamic"

const ServicesPage = async ({ searchParams }: ServicesPageProps) => {
  const parsedBarberId = idSchema.safeParse(searchParams?.barberId ?? "")
  const barberId = parsedBarberId.success ? parsedBarberId.data : null

  if (!barberId) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="text-xl font-bold md:text-2xl">Servicos</h1>
          <p className="mt-3 text-sm text-zinc-400">Selecione um barbeiro antes de escolher o servico.</p>
          <Link
            href="/barbers"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Escolher barbeiro
          </Link>
        </main>
      </>
    )
  }

  let selectedBarber: { id: string; name: string } | null = null
  let services: Array<{
    id: string
    name: string
    description: string
    imageUrl: string
    price: { toString: () => string }
  }> = []

  try {
    ;[selectedBarber, services] = await Promise.all([
      db.barber.findFirst({
        where: {
          id: barberId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      db.service.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          price: true,
        },
      }),
    ])
  } catch (error) {
    console.error("[services-page] failed to load barber/services", {
      barberId,
      error,
    })
  }

  if (!selectedBarber) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="text-xl font-bold md:text-2xl">Barbeiro nao encontrado</h1>
          <Link
            href="/barbers"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Voltar para barbeiros
          </Link>
        </main>
      </>
    )
  }

  const serializedServices = services.map((service) => ({
    ...service,
    imageUrl: getSafePublicImagePath(service.imageUrl, "/logo-jesi.png"),
    price: service.price.toString(),
  }))

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-bold md:text-2xl">Servicos</h1>
              <p className="text-sm text-zinc-400">
                Barbeiro selecionado:{" "}
                <span className="font-semibold text-zinc-100">{selectedBarber.name}</span>
              </p>
            </div>

            <Link
              href="/barbers"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/35 bg-brand/10 px-3 text-sm font-medium text-brand-100 transition-colors hover:bg-brand/20"
            >
              Trocar barbeiro
            </Link>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {serializedServices.map((service) => (
              <ServiceItem
                key={service.id}
                service={service}
                barber={{ id: selectedBarber.id, name: selectedBarber.name }}
              />
            ))}
          </div>

          {serializedServices.length === 0 && (
            <p className="text-sm text-zinc-400">Nenhum servico encontrado.</p>
          )}
        </section>
      </main>
    </>
  )
}

export default ServicesPage
