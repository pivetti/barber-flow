import Header from "@/components/header"
import BookingFlow from "@/features/booking/components/booking-flow"
import { db } from "@/lib/prisma"
import { getSafePublicImagePath } from "@/lib/safe-public-image"

export const dynamic = "force-dynamic"

const AgendarPage = async () => {
  let barbers: Array<{ id: string; name: string; imageUrl: string }> = []
  let services: Array<{
    id: string
    name: string
    description: string
    imageUrl: string
    price: string
    durationMinutes: number
    bufferBeforeMinutes: number
    bufferAfterMinutes: number
  }> = []

  try {
    const [barberResult, serviceResult] = await Promise.all([
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

    barbers = barberResult.map((barber) => ({
      id: barber.id,
      name: barber.name,
      imageUrl: getSafePublicImagePath(barber.imageUrl, "/logo-jesi.png"),
    }))

    services = serviceResult.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      imageUrl: getSafePublicImagePath(service.imageUrl, "/logo-jesi.png"),
      price: service.price.toString(),
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    }))
  } catch (error) {
    console.error("[agendar-page] failed to load booking flow data", error)
  }

  return (
    <>
      <Header />
      <BookingFlow barbers={barbers} services={services} />
    </>
  )
}

export default AgendarPage
