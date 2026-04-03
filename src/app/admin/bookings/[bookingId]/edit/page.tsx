import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { updateAdminBookingField } from "@/features/admin/actions/bookings"
import PhoneMaskedInput from "./phone-masked-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canManageBookings } from "@/lib/admin-permissions"
import { toBrasiliaWallClock } from "@/lib/brasilia-time"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

const editableBookingFields = ["client", "service", "time", "date"] as const
type EditableBookingField = (typeof editableBookingFields)[number]

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

const getFieldTitle = (field: EditableBookingField) => {
  if (field === "client") return "Editar cliente"
  if (field === "service") return "Editar servico"
  if (field === "time") return "Editar horario"
  return "Editar data"
}

const getFieldDescription = (field: EditableBookingField) => {
  if (field === "client") return "Atualize o nome e telefone do cliente."
  if (field === "service") return "Troque o servico vinculado ao agendamento."
  if (field === "time") return "Altere apenas o horario mantendo a data atual."
  return "Altere apenas a data mantendo o horario atual."
}

const BookingEditPage = async ({ params, searchParams }: BookingEditPageProps) => {
  const admin = await requireAdmin()
  if (!canManageBookings(admin.role)) {
    notFound()
  }

  const fieldParam = searchParams?.field

  if (!isEditableBookingField(fieldParam)) {
    notFound()
  }

  const [booking, services] = await Promise.all([
    db.booking.findFirst({
      where: {
        id: params.bookingId,
        barberId: admin.id,
      },
      include: {
        service: true,
      },
    }),
    fieldParam === "service"
      ? db.service.findMany({
          orderBy: {
            name: "asc",
          },
        })
      : Promise.resolve([]),
  ])

  if (!booking) {
    notFound()
  }

  const bookingDateInBrasilia = toBrasiliaWallClock(booking.date)
  const defaultDate = format(bookingDateInBrasilia, "yyyy-MM-dd")
  const defaultTime = format(bookingDateInBrasilia, "HH:mm")

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/75">Edicao</p>
              <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">{getFieldTitle(fieldParam)}</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">{getFieldDescription(fieldParam)}</p>
            </div>

            <Link
              href={`/admin/bookings/${booking.id}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-violet-500/40 hover:bg-zinc-800 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para agendamento
            </Link>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
              <p className="text-xs font-medium text-zinc-400">
                Cliente: <span className="text-zinc-100">{booking.customerName}</span>
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                Data atual:{" "}
                <span className="text-zinc-300">
                  {format(bookingDateInBrasilia, "dd 'de' MMMM 'de' yyyy - HH:mm", { locale: ptBR })}
                </span>
              </p>
            </div>

            <form action={updateAdminBookingField} className="mt-4 space-y-4">
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="field" value={fieldParam} />

              {fieldParam === "client" && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="customerName" className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Nome do cliente
                    </label>
                    <Input
                      id="customerName"
                      name="customerName"
                      defaultValue={booking.customerName}
                      required
                      className="h-11 rounded-xl border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="customerPhone" className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Telefone
                    </label>
                    <PhoneMaskedInput defaultValue={booking.customerPhone} />
                  </div>
                </>
              )}

              {fieldParam === "service" && (
                <div className="space-y-2">
                  <label htmlFor="serviceId" className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Servico
                  </label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    defaultValue={booking.serviceId}
                    required
                    className="h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-violet-500/50"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {fieldParam === "time" && (
                <div className="space-y-2">
                  <label htmlFor="time" className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Horario
                  </label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    defaultValue={defaultTime}
                    required
                    className="h-11 rounded-xl border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                </div>
              )}

              {fieldParam === "date" && (
                <div className="space-y-2">
                  <label htmlFor="date" className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Data
                  </label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    defaultValue={defaultDate}
                    required
                    className="h-11 rounded-xl border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Cancelar
                </Link>
                <Button type="submit" className="h-11 rounded-xl border border-violet-500/35 bg-violet-500/15 px-5 text-sm font-semibold text-violet-100 hover:bg-violet-500/25">
                  <Save className="mr-1.5 h-4 w-4" />
                  Salvar alteracoes
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  )
}

export default BookingEditPage
