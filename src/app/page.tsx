import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MapPinIcon } from "lucide-react"
import Image from "next/image"
import Header from "@/components/header"
import BookingFlow from "@/features/booking/components/booking-flow"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { getSafePublicImagePath } from "@/lib/safe-public-image"

export const dynamic = "force-dynamic"

const Home = async () => {
  const [barbers, services] = await Promise.all([
    db.barber.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
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

  const now = toBrasiliaWallClock(new Date())
  const serializedBarbers = barbers.map((barber) => ({
    id: barber.id,
    name: barber.name,
    imageUrl: getSafePublicImagePath(barber.imageUrl, "/logo-jesi.png"),
  }))
  const serializedServices = services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    imageUrl: getSafePublicImagePath(service.imageUrl, "/logo-jesi.png"),
    price: service.price.toString(),
  }))

  return (
    <div>
      <Header />

      <main className="w-full px-4 py-8 sm:px-6">
        <section className="mx-auto w-full max-w-6xl space-y-1 xl:max-w-7xl">
          <h2 className="text-xl font-bold md:text-2xl">Ola, seja bem-vindo!</h2>

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

        <section className="mx-auto mt-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 xl:max-w-7xl">
          <div className="relative h-52 w-full sm:h-64">
            <Image
              alt="Ambiente da barbearia"
              src="/banner-jesi.png"
              fill
              priority
              sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(100vw - 3rem), 1280px"
              className="object-cover"
            />
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-100 sm:text-2xl">
                Barbearia do Jesi
              </h2>
              <p className="flex items-start gap-2 text-sm text-zinc-300">
                <MapPinIcon className="mt-0.5 h-4 w-4 text-violet-300" />
                Rua Exemplo, 123 - Centro, Sao Paulo - SP
              </p>
            </div>
          </div>
        </section>

        <BookingFlow
          id="agendamento"
          rootElement="section"
          className="mt-8 px-0 py-0 sm:px-0 lg:py-0"
          barbers={serializedBarbers}
          services={serializedServices}
        />
      </main>
    </div>
  )
}

export default Home
