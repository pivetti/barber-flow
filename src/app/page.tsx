import { MapPinIcon } from "lucide-react"
import Image from "next/image"
import Header from "@/components/header"
import HomeScheduleButton from "@/components/home-schedule-button"
import BookingFlow from "@/features/booking/components/booking-flow"
import { db } from "@/lib/prisma"
import { getSafePublicImagePath } from "@/lib/safe-public-image"
import { getOrCreateSiteSettings } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

const Home = async () => {
  const [settings, barbers, services] = await Promise.all([
    getOrCreateSiteSettings(),
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
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    }),
  ])

  const bannerUrl = getSafePublicImagePath(settings.bannerUrl, "/banner-jesi.png")
  const businessLocation = settings.businessLocation.trim()
  const businessDescription = settings.businessDescription.trim()
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
    durationMinutes: service.durationMinutes,
    bufferBeforeMinutes: service.bufferBeforeMinutes,
    bufferAfterMinutes: service.bufferAfterMinutes,
  }))

  return (
    <div className="bg-zinc-950">
      <Header />

      <main className="w-full scroll-smooth bg-zinc-950">
        <section className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-3xl flex-col px-5 pb-12 pt-14 sm:px-6 md:min-h-[calc(100svh-61px)] md:pt-16">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/45 shadow-2xl shadow-black/25">
            <div className="relative aspect-[16/9] w-full bg-zinc-900">
              <Image
                alt="Ambiente da barbearia"
                src={bannerUrl}
                fill
                priority
                sizes="(max-width: 640px) calc(100vw - 2.5rem), 448px"
                className="object-cover"
              />
            </div>

            <div className="space-y-3 p-4">
              <h2 className="text-xl font-bold leading-tight text-zinc-50">
                {settings.businessName}
              </h2>

              {businessLocation && (
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <MapPinIcon className="h-4 w-4 shrink-0 text-brand-100" />
                  <span>{businessLocation}</span>
                </p>
              )}

              {businessDescription && (
                <p className="text-sm leading-relaxed text-zinc-300">
                  {businessDescription}
                </p>
              )}
            </div>
          </div>

          <div className="mx-auto mt-6 w-full max-w-md">
            <HomeScheduleButton />
          </div>
        </section>

        <BookingFlow
          id="agendamento"
          rootElement="section"
          className="px-5 pt-0 sm:px-6 lg:pt-0"
          barbers={serializedBarbers}
          services={serializedServices}
        />
      </main>
    </div>
  )
}

export default Home
