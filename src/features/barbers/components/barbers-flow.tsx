"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  parseCustomerProfile,
} from "@/features/booking/lib/customer-profile"
import { Button } from "@/components/ui/button"

interface BarbersFlowProps {
  barbers: Array<{
    id: string
    name: string
    imageUrl: string
  }>
}

const BarbersFlow = ({ barbers }: BarbersFlowProps) => {
  const router = useRouter()
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    const savedProfile = parseCustomerProfile(
      window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY),
    )
    if (!savedProfile) {
      const nextPath = encodeURIComponent("/barbers")
      router.replace(`/agendar?next=${nextPath}`)
      return
    }

    setProfileReady(true)
  }, [router])

  const handleSelectBarber = (barberId: string) => {
    router.push(`/services?barberId=${barberId}`)
  }

  if (!profileReady) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <p className="text-sm text-zinc-300">Carregando...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <h1 className="text-xl font-bold md:text-2xl">Escolha o barbeiro</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Selecione o profissional para continuar.
        </p>
      </section>

      <section className="mt-6">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
          {barbers.map((barber) => (
            <article
              key={barber.id}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70"
            >
              <div className="relative h-28 w-full bg-zinc-950/60 sm:h-36 lg:h-52">
                <Image
                  alt={barber.name}
                  src={barber.imageUrl}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-contain"
                />
              </div>

              <div className="space-y-2 p-3 sm:p-3">
                <h2 className="line-clamp-1 text-sm font-semibold leading-tight text-zinc-100 sm:text-base">
                  {barber.name}
                </h2>
                <Button
                  className="h-7.5 w-full rounded-xl bg-violet-500 px-3 text-xs font-semibold text-white hover:bg-violet-400 sm:h-9 sm:text-sm"
                  onClick={() => handleSelectBarber(barber.id)}
                >
                  Selecionar
                </Button>
              </div>
            </article>
          ))}
        </div>

        {barbers.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum barbeiro encontrado.</p>
        )}
      </section>
    </main>
  )
}

export default BarbersFlow
