import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import AdminHeader from "@/features/admin/components/admin-header"
import {
  addWorkingHour,
  deleteBlockedTime,
  deleteWorkingHour,
  updateSlotInterval,
} from "@/features/admin/actions/schedule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canManageSchedule } from "@/lib/admin-permissions"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { redirect } from "next/navigation"
import BlockedTimeForm from "./blocked-time-form"

const weekDays = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terca-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" },
]

const slotIntervalOptions = [10, 15, 20, 30]

const ScheduleAdminPage = async () => {
  const admin = await requireAdmin()
  if (!canManageSchedule(admin.role)) {
    redirect("/admin/dashboard")
  }

  const [workingHours, blockedTimes, settings] = await Promise.all([
    db.workingHour.findMany({
      where: {
        barberId: admin.id,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    db.blockedTime.findMany({
      where: {
        barberId: admin.id,
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
      take: 50,
    }),
    db.scheduleSettings.findUnique({
      where: {
        barberId: admin.id,
      },
    }),
  ])

  const workingHoursByDay = new Map<number, typeof workingHours>()

  for (const day of weekDays) {
    workingHoursByDay.set(
      day.value,
      workingHours.filter((workingHour) => workingHour.dayOfWeek === day.value),
    )
  }

  const slotIntervalMinutes = settings?.slotIntervalMinutes ?? 30

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">Horarios</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Gestao de horarios</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Configure bloqueios, intervalo entre horarios e jornada semanal com visual premium e consistente.
            </p>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_18px_38px_rgba(0,0,0,0.36)] sm:p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Bloqueios de horario</h2>
            <p className="mt-1 text-sm text-zinc-400">Crie bloqueios por data com hora inicial e final.</p>

            <BlockedTimeForm />

            <div className="mt-4 space-y-2">
              {blockedTimes.map((blockedTime) => (
                <form
                  key={blockedTime.id}
                  action={deleteBlockedTime}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/70 bg-zinc-900/65 p-3 text-sm text-zinc-200"
                >
                  <input type="hidden" name="blockedTimeId" value={blockedTime.id} />
                  <span>
                    {format(blockedTime.date, "dd/MM/yyyy", { locale: ptBR })} - {blockedTime.startTime} ate {blockedTime.endTime}
                    {blockedTime.reason ? ` - ${blockedTime.reason}` : ""}
                  </span>
                  <Button type="submit" variant="outline" className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 hover:bg-zinc-800">
                    Remover
                  </Button>
                </form>
              ))}

              {blockedTimes.length === 0 && (
                <p className="rounded-xl border border-zinc-800/70 bg-zinc-900/55 p-4 text-sm text-zinc-400">
                  Nenhum bloqueio cadastrado.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_18px_38px_rgba(0,0,0,0.36)] sm:p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Intervalo entre horarios</h2>
            <p className="mt-1 text-sm text-zinc-400">Este intervalo define a geracao automatica dos slots de agendamento.</p>
            <form action={updateSlotInterval} className="mt-4 flex flex-wrap items-end gap-2">
              <label className="text-sm text-zinc-300">
                Intervalo
                <select
                  name="slotIntervalMinutes"
                  defaultValue={String(slotIntervalMinutes)}
                  className="mt-1 block h-10 rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-3 text-zinc-100"
                >
                  {slotIntervalOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} minutos
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25">
                Salvar configuracao
              </Button>
            </form>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_18px_38px_rgba(0,0,0,0.36)] sm:p-5">
            <h2 className="text-lg font-semibold text-zinc-100">Horario de trabalho semanal</h2>
            <p className="mt-1 text-sm text-zinc-400">Adicione um ou mais intervalos por dia.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weekDays.map((day) => {
                const intervals = workingHoursByDay.get(day.value) ?? []

                return (
                  <article key={day.value} className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/55 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-zinc-100">{day.label}</h3>
                      {intervals.length === 0 ? (
                        <span className="rounded-full border border-zinc-700/80 bg-zinc-900/85 px-2 py-1 text-xs text-zinc-400">Fechado</span>
                      ) : (
                        <span className="rounded-full border border-emerald-500/35 bg-emerald-500/14 px-2 py-1 text-xs text-emerald-300">
                          {intervals.length} intervalo(s)
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {intervals.map((interval) => (
                        <form
                          key={interval.id}
                          action={deleteWorkingHour}
                          className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/70 p-2 text-sm text-zinc-200"
                        >
                          <input type="hidden" name="workingHourId" value={interval.id} />
                          <span>
                            {interval.startTime} - {interval.endTime}
                          </span>
                          <Button type="submit" size="sm" variant="outline" className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 hover:bg-zinc-800">
                            Remover
                          </Button>
                        </form>
                      ))}

                      {intervals.length === 0 && (
                        <p className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-500">
                          Nenhum intervalo cadastrado.
                        </p>
                      )}
                    </div>

                    <form action={addWorkingHour} className="mt-3 grid grid-cols-2 gap-2">
                      <input type="hidden" name="dayOfWeek" value={day.value} />
                      <label className="min-w-0 text-xs text-zinc-400">
                        Inicio
                        <Input
                          type="time"
                          name="startTime"
                          required
                          step={60}
                          inputMode="numeric"
                          pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                          title="Use o formato HH:MM"
                          className="mt-1 block h-14 w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-white [color-scheme:dark]"
                        />
                      </label>
                      <label className="min-w-0 text-xs text-zinc-400">
                        Fim
                        <Input
                          type="time"
                          name="endTime"
                          required
                          step={60}
                          inputMode="numeric"
                          pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
                          title="Use o formato HH:MM"
                          className="mt-1 block h-14 w-full min-w-0 appearance-none overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-white [color-scheme:dark]"
                        />
                      </label>
                      <Button type="submit" className="col-span-2 rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25">
                        Adicionar intervalo
                      </Button>
                    </form>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default ScheduleAdminPage
