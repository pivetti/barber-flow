import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { canManageBookings } from "@/lib/admin-permissions"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import AdminBookingEditFlow from "./admin-booking-edit-flow"

const editableBookingFields = ["client", "service", "time", "date"] as const
type EditableBookingField = (typeof editableBookingFields)[number]
type EditInitialStep = "customer" | "barber" | "service" | "datetime" | "resume"

interface BookingEditPageProps {
  params: {
    bookingId: string
  }
  searchParams?: {
    field?: string
  }
}

const isEditableBookingField = (field?: string): field is EditableBookingField => {
  if (!field) {
    return false
  }

  return editableBookingFields.includes(field as EditableBookingField)
}

const getInitialStep = (field?: string): EditInitialStep => {
  if (!isEditableBookingField(field)) {
    return "customer"
  }

  if (field === "client") {
    return "customer"
  }

  if (field === "service") {
    return "service"
  }

  return "datetime"
}

const BookingEditPage = async ({ params, searchParams }: BookingEditPageProps) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    notFound()
  }

  const [booking, barbers, services] = await Promise.all([
    db.booking.findFirst({
      where: {
        id: params.bookingId,
        barberId: admin.id,
      },
      include: {
        barber: true,
        service: true,
      },
    }),
    db.barber.findMany({
      where: {
        id: admin.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
      orderBy: {
        name: "asc",
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
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        isActive: true,
      },
    }),
  ])

  if (!booking) {
    notFound()
  }

  const bookingDateInBrasilia = toBrasiliaWallClock(booking.startsAt)
  const dashboardHref = `/admin/dashboard?date=${format(bookingDateInBrasilia, "yyyy-MM-dd")}`

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Edicao</p>
              <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Editar agendamento</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
                Atualize os dados em etapas e confirme tudo no resumo final.
              </p>
            </div>

            <Link
              href={dashboardHref}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-brand/40 hover:bg-zinc-800 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para agenda
            </Link>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <AdminBookingEditFlow
            booking={{
              id: booking.id,
              customerName: booking.customerName,
              customerPhone: booking.customerPhone,
              barberId: booking.barberId,
              serviceId: booking.serviceId,
              startsAtIso: booking.startsAt.toISOString(),
              startsAtDateKey: format(bookingDateInBrasilia, "yyyy-MM-dd"),
              startsAtTime: format(bookingDateInBrasilia, "HH:mm"),
            }}
            barbers={barbers}
            services={services.map((service) => ({
              ...service,
              price: service.price.toString(),
            }))}
            initialStep={getInitialStep(searchParams?.field)}
            dashboardHref={dashboardHref}
          />
        </section>
      </main>
    </>
  )
}

export default BookingEditPage
