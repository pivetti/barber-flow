import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { InstagramIcon, MapPinIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Header from "@/components/header"
import { BARBER_CONTACTS } from "@/features/barbers/constants/barber-contacts"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"

const Home = async () => {
  const barbers = await db.barber.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  })
  const now = toBrasiliaWallClock(new Date())

  return (
    <div>
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="space-y-1">
          <h2 className="text-xl font-bold md:text-2xl">
            Olá, seja bem-vindo!
          </h2>

          <p className="text-sm text-zinc-400">
            <span className="capitalize">
              {format(now, "EEEE, dd", { locale: ptBR })}
            </span>
            <span>&nbsp;de&nbsp;</span>
            <span className="capitalize">
              {format(now, "MMMM", { locale: ptBR })}
            </span>
          </p>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="relative h-52 w-full sm:h-64">
            <Image
              alt="Ambiente da barbearia"
              src="/banner-jesi.png"
              fill
              priority
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 3rem), 1152px"
              className="object-cover"
            />
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-bold text-zinc-100 sm:text-2xl">
                  Barbearia do Jesi
                </h2>
                <p className="flex items-start gap-2 text-sm text-zinc-300">
                  <MapPinIcon className="mt-0.5 h-4 w-4 text-violet-300" />
                  Rua Exemplo, 123 - Centro, Sao Paulo - SP
                </p>
              </div>

              <Link
                href="/agendar"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/10 px-5 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/20 sm:h-11 sm:w-auto sm:shrink-0 sm:px-6 sm:text-base"
              >
                Agendar
              </Link>
            </div>

            <div className="space-y-2 border-t border-zinc-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                Sobre nós
              </h3>
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
          <h3 className="mb-4 text-xs font-bold uppercase text-zinc-400">
            Barbeiros
          </h3>
          <p className="mb-4 text-sm text-zinc-300">Conheça nossos barbeiros:</p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {barbers.map((barber) => (
              <article
                key={barber.id}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
              >
                <div className="relative h-36 w-full bg-zinc-950/60 sm:h-44">
                  <Image
                    alt={barber.name}
                    src={barber.imageUrl}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-contain"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100 sm:text-base">
                      {barber.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={BARBER_CONTACTS[barber.name]?.whatsapp ?? "https://wa.me/5500000000000"}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`WhatsApp de ${barber.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 text-zinc-200 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-100"
                      >
                        <Image
                          src="/Logo do WhatsApp em estilo minimalista.png"
                          alt=""
                          aria-hidden="true"
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] object-contain"
                        />
                      </a>
                      <a
                        href={BARBER_CONTACTS[barber.name]?.instagram ?? "https://instagram.com/"}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Instagram de ${barber.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80 text-zinc-200 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-100"
                      >
                        <InstagramIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {barbers.length === 0 && (
            <p className="text-sm text-zinc-400">Nenhum barbeiro encontrado.</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default Home
