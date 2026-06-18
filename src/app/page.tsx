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

  const heroLogoUrl = getSafePublicImagePath(settings.logoUrl, "/logo-jesi.png")
  const businessLocation = settings.businessLocation.trim()
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
    <div className="home-shell">
      <Header />

      <main className="w-full scroll-smooth bg-transparent">
        <section className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-xl flex-col px-5 pb-6 pt-5 md:max-w-3xl md:px-6 md:pb-8 md:pt-6">
          <div className="relative h-[clamp(344px,52svh,468px)] w-full overflow-hidden rounded-[1.75rem] border border-brand/15 bg-[#030303] shadow-[0_24px_64px_-54px_rgba(0,0,0,0.9)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgb(var(--brand-primary-rgb)_/_0.16),transparent_29%),radial-gradient(circle_at_50%_46%,rgb(var(--brand-secondary-rgb)_/_0.16),transparent_50%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.24)_48%,rgba(0,0,0,0.95)_100%)]" />
            <div className="absolute inset-x-0 top-6 flex h-[64%] justify-center px-8">
              <div className="relative aspect-square w-[min(58vw,248px)]">
                <Image
                  alt=""
                  src={heroLogoUrl}
                  fill
                  priority
                  aria-hidden="true"
                  sizes="(max-width: 640px) 58vw, 248px"
                  className="object-contain opacity-95 drop-shadow-[0_28px_55px_rgba(0,0,0,0.72)]"
                />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-32 md:px-8 md:pb-9">
              <h1 className="max-w-[18rem] break-words text-[1.75rem] font-semibold leading-[1.08] tracking-normal text-zinc-50 drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
                {settings.businessName}
              </h1>

              {businessLocation && (
                <p className="mt-3 max-w-[18rem] break-words text-sm font-medium leading-relaxed text-zinc-300/75">
                  {businessLocation}
                </p>
              )}
            </div>
          </div>

          <div className="mt-7 w-full">
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
