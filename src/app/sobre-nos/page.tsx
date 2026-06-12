import { MapPinIcon } from "lucide-react"
import Image from "next/image"
import Header from "@/components/header"
import { db } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const SobreNosPage = async () => {
  const barbers = await db.barber.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="relative h-52 w-full sm:h-64">
            <Image
              alt="Ambiente da barbearia"
              src="/banner-jesi.png"
              fill
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 3rem), 1152px"
              className="object-cover"
            />
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl">
                Barbearia do Jesi
              </h1>
              <p className="flex items-start gap-2 text-sm text-zinc-300">
                <MapPinIcon className="mt-0.5 h-4 w-4 text-brand-100" />
                Rua Exemplo, 123 - Centro, Sao Paulo - SP
              </p>
            </div>

            <div className="space-y-2 border-t border-zinc-800 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Sobre nós
              </h2>
              <p className="text-sm leading-6 text-zinc-300">
                Somos uma barbearia focada em atendimento próximo, técnica e
                consistência. Nosso objetivo é entregar cortes, barba e
                acabamento com qualidade para que você saia daqui com visual
                alinhado e confiança renovada.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
            Barbeiros
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {barbers.map((barber) => (
              <article
                key={barber.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
              >
                <div className="relative h-36 w-full sm:h-44">
                  <Image
                    alt={barber.name}
                    src={barber.imageUrl}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <p className="text-sm font-semibold text-zinc-100 sm:text-base">
                    {barber.name}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {barbers.length === 0 && (
            <p className="text-sm text-zinc-400">Nenhum barbeiro encontrado.</p>
          )}
        </section>
      </main>
    </>
  )
}

export default SobreNosPage
