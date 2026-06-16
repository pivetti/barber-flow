"use client"

import {
  addWeeks,
  endOfDay,
  format,
  getDay,
  isPast,
  isSameDay,
  isToday,
  set,
  startOfDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Phone,
  Scissors,
  UserRound,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { Dispatch, FormEvent, FormEventHandler, ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  BookingFlowProgress as CheckoutProgress,
  BookingStepShell,
  BookingSummaryRow as SummaryRow,
} from "@/features/booking/components/booking-flow-ui"
import LgpdBookingNotice from "@/features/booking/components/lgpd-booking-notice"
import { createBooking } from "@/features/booking/actions/create-booking"
import { getBookingDayContext } from "@/features/booking/actions/get-booking-day-context"
import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  CustomerProfile,
  isCustomerProfileValid,
  normalizeCustomerProfile,
  parseCustomerProfile,
} from "@/features/booking/lib/customer-profile"
import { getServiceImageUrl } from "@/features/services/lib/get-service-image-url"
import { cn } from "@/lib/utils"

interface BookingFlowBarber {
  id: string
  name: string
  imageUrl: string
}

interface BookingFlowService {
  id: string
  name: string
  description: string
  imageUrl: string
  price: string
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
}

interface BookingFlowProps {
  barbers: BookingFlowBarber[]
  services: BookingFlowService[]
  id?: string
  className?: string
  rootElement?: "main" | "section"
}

interface TimeSlot {
  time: string
  available: boolean
  unavailableMessage?: string
}

type FlowStepId = "customer" | "barber" | "service" | "datetime" | "resume"
type DayContextStatus = "idle" | "loading" | "loaded" | "error"

const emptyProfile: CustomerProfile = {
  name: "",
  phone: "",
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11)

  if (digits.length <= 10) {
    return digits.replace(
      /^(\d{0,2})(\d{0,4})(\d{0,4}).*/,
      (_, ddd, firstPart, secondPart) => {
        if (!ddd) return ""
        if (!firstPart) return `(${ddd}`
        if (!secondPart) return `(${ddd}) ${firstPart}`
        return `(${ddd}) ${firstPart}-${secondPart}`
      },
    )
  }

  return digits.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3")
}

const getEasterDate = (year: number) => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const getBrazilNationalHolidays = (year: number) => {
  const easter = getEasterDate(year)

  return [
    new Date(year, 0, 1),
    new Date(year, 3, 21),
    new Date(year, 4, 1),
    new Date(year, 8, 7),
    new Date(year, 9, 12),
    new Date(year, 10, 2),
    new Date(year, 10, 15),
    new Date(year, 11, 25),
    addDays(easter, -48),
    addDays(easter, -47),
    addDays(easter, -2),
    addDays(easter, 60),
  ]
}

const isSundayOrBrazilHoliday = (date: Date) => {
  if (getDay(date) === 0) {
    return true
  }

  return getBrazilNationalHolidays(date.getFullYear()).some((holiday) =>
    isSameDay(holiday, date),
  )
}

const getTimeList = (selectedDay: Date, availableTimes: string[]): TimeSlot[] => {
  if (isSundayOrBrazilHoliday(selectedDay)) {
    return []
  }

  return availableTimes.map((time) => {
    const [hour, minutes] = time.split(":").map(Number)
    const slotDate = set(selectedDay, {
      hours: hour,
      minutes,
      seconds: 0,
      milliseconds: 0,
    })

    if (isToday(selectedDay) && isPast(slotDate)) {
      return {
        time,
        available: false,
        unavailableMessage: "Este horario ja passou.",
      }
    }

    return {
      time,
      available: true,
    }
  })
}

const getPreferredScrollBehavior = (): ScrollBehavior => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
}

const scrollToElement = (elementId: string) => {
  window.requestAnimationFrame(() => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: getPreferredScrollBehavior(),
      block: "start",
    })
  })
}

const scrollToStep = (stepId: FlowStepId) => {
  scrollToElement(`booking-${stepId}`)
}

const StepShell = ({
  id,
  eyebrow,
  title,
  description,
  isActive,
  isComplete,
  isDisabled,
  children,
}: {
  id: FlowStepId
  eyebrow: string
  title: string
  description: string
  isActive: boolean
  isComplete: boolean
  isDisabled?: boolean
  children: ReactNode
}) => (
  <BookingStepShell
    id={`booking-${id}`}
    eyebrow={eyebrow}
    title={title}
    description={description}
    isActive={isActive}
    isComplete={isComplete}
    isDisabled={isDisabled}
  >
    {children}
  </BookingStepShell>
)

const CollapsedStepCard = ({
  id,
  number,
  title,
  summary,
  isComplete,
  isEnabled,
  onOpen,
}: {
  id: FlowStepId
  number: string
  title: string
  summary: string
  isComplete: boolean
  isEnabled: boolean
  onOpen: Dispatch<FlowStepId>
}) => (
  <button
    id={`booking-${id}`}
    type="button"
    disabled={!isEnabled}
    onClick={() => onOpen(id)}
    className={cn(
      "flex w-full scroll-mt-24 items-center gap-3 rounded-lg border bg-zinc-900/35 p-3 text-left transition-colors",
      isEnabled
        ? "border-zinc-800 hover:border-brand-hover/45 hover:bg-zinc-900/65"
        : "cursor-not-allowed border-zinc-900 bg-zinc-950/30 opacity-65",
      isComplete && "border-emerald-500/25 bg-emerald-500/5",
    )}
  >
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
        isComplete
          ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
          : "border-zinc-700 bg-zinc-950 text-zinc-500",
      )}
    >
      {isComplete ? <Check className="h-4 w-4" /> : number}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-zinc-100">{title}</span>
      <span className="mt-0.5 block truncate text-xs text-zinc-500">{summary}</span>
    </span>
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1 text-xs font-semibold sm:inline-flex",
        isEnabled ? "text-brand-100" : "text-zinc-600",
      )}
    >
      {isComplete ? "Editar" : "Abrir"}
      <ChevronRight className="h-3.5 w-3.5" />
    </span>
  </button>
)

const CustomerStep = ({
  profile,
  customerError,
  isActive,
  isComplete,
  onChange,
  onSubmit,
}: {
  profile: CustomerProfile
  customerError: string | null
  isActive: boolean
  isComplete: boolean
  onChange: Dispatch<CustomerProfile>
  onSubmit: FormEventHandler<HTMLFormElement>
}) => (
  <StepShell
    id="customer"
    eyebrow="Etapa 01"
    title="Seus dados"
    description="Nome e telefone com DDD para identificarmos sua reserva."
    isActive={isActive}
    isComplete={isComplete}
  >
    <form className="grid gap-3 sm:grid-cols-[1fr_220px_auto]" onSubmit={onSubmit}>
      <label className="space-y-2">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <UserRound className="h-4 w-4 text-brand-100" />
          Nome
        </span>
        <Input
          value={profile.name}
          onChange={(event) =>
            onChange({
              ...profile,
              name: event.target.value,
            })
          }
          placeholder="Seu nome"
          className="h-12 rounded-lg border-zinc-700 bg-zinc-950/60 text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-brand-hover"
          required
        />
      </label>

      <label className="space-y-2">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Phone className="h-4 w-4 text-brand-100" />
          Telefone
        </span>
        <Input
          type="tel"
          inputMode="tel"
          value={profile.phone}
          onChange={(event) =>
            onChange({
              ...profile,
              phone: formatPhone(event.target.value),
            })
          }
          placeholder="(00) 00000-0000"
          className="h-12 rounded-lg border-zinc-700 bg-zinc-950/60 text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-brand-hover"
          required
        />
      </label>

      <div className="flex items-end">
        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-hover sm:w-auto"
        >
          <Check className="h-4 w-4" />
          Continuar
        </Button>
      </div>
    </form>

    {customerError && (
      <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {customerError}
      </p>
    )}
  </StepShell>
)

const BarberStep = ({
  barbers,
  selectedBarberId,
  isActive,
  isComplete,
  isDisabled,
  onSelectBarber,
}: {
  barbers: BookingFlowBarber[]
  selectedBarberId?: string
  isActive: boolean
  isComplete: boolean
  isDisabled: boolean
  onSelectBarber: Dispatch<string>
}) => (
  <StepShell
    id="barber"
    eyebrow="Etapa 02"
    title="Escolha o barbeiro"
    description="Selecione o profissional que vai cuidar do seu atendimento."
    isActive={isActive}
    isComplete={isComplete}
    isDisabled={isDisabled}
  >
    {isDisabled ? (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-400">
        Preencha seus dados para liberar a escolha do barbeiro.
      </p>
    ) : barbers.length > 0 ? (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {barbers.map((barber) => {
          const isSelected = selectedBarberId === barber.id

          return (
            <button
              key={barber.id}
              type="button"
              onClick={() => onSelectBarber(barber.id)}
              aria-pressed={isSelected}
              className={cn(
                "group overflow-hidden rounded-lg border bg-zinc-950/45 text-left transition-all hover:border-brand-hover/50 hover:bg-zinc-900",
                isSelected
                  ? "border-brand-hover bg-brand/10 shadow-sm shadow-brand-950/30"
                  : "border-zinc-800",
              )}
            >
              <span className="relative block h-24 bg-zinc-950 sm:h-28">
                <Image
                  src={barber.imageUrl}
                  alt={barber.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-contain p-2.5 transition-transform duration-200 group-hover:scale-[1.02]"
                />
                {isSelected && (
                  <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </span>
              <span className="flex items-center justify-between gap-3 p-3">
                <span className="min-w-0 truncate text-sm font-semibold text-zinc-100 sm:text-base">
                  {barber.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    isSelected
                      ? "border-brand-hover/45 bg-brand/20 text-brand-100"
                      : "border-zinc-700 text-zinc-400",
                  )}
                >
                  {isSelected ? "Selecionado" : "Escolher"}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    ) : (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-400">
        Nenhum barbeiro disponivel no momento.
      </p>
    )}
  </StepShell>
)

const ServiceStep = ({
  services,
  selectedServiceId,
  isActive,
  isComplete,
  isDisabled,
  onSelectService,
}: {
  services: BookingFlowService[]
  selectedServiceId?: string
  isActive: boolean
  isComplete: boolean
  isDisabled: boolean
  onSelectService: Dispatch<string>
}) => (
  <StepShell
    id="service"
    eyebrow="Etapa 03"
    title="Escolha o servico"
    description="Compare as opcoes e selecione o servico desejado."
    isActive={isActive}
    isComplete={isComplete}
    isDisabled={isDisabled}
  >
    {isDisabled ? (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-400">
        Escolha um barbeiro para liberar os servicos.
      </p>
    ) : services.length > 0 ? (
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedServiceId === service.id
          const serviceImageUrl = getServiceImageUrl(service.name, service.imageUrl)

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService(service.id)}
              aria-pressed={isSelected}
              className={cn(
                "grid grid-cols-[56px_1fr] gap-3 rounded-lg border bg-zinc-950/45 p-3 text-left transition-colors hover:border-brand-hover/50 hover:bg-zinc-900 sm:grid-cols-[64px_1fr]",
                isSelected ? "border-brand-hover bg-brand/10" : "border-zinc-800",
              )}
            >
              <span className="relative h-14 w-14 overflow-hidden rounded-lg bg-zinc-900 sm:h-16 sm:w-16">
                <Image
                  src={serviceImageUrl}
                  alt={service.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>

              <span className="min-w-0">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold leading-tight text-zinc-100 sm:text-base">
                    {service.name}
                  </span>
                  {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-100" />}
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  {service.description}
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-brand-hover/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand-100">
                    {currencyFormatter.format(Number(service.price))}
                  </span>
                  <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/75 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {service.durationMinutes} min
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    ) : (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-400">
        Nenhum servico disponivel no momento.
      </p>
    )}
  </StepShell>
)

const DateTimeStep = ({
  selectedDay,
  selectedTime,
  selectedBarber,
  dayContextStatus,
  timeList,
  maxBookingDate,
  isActive,
  isComplete,
  isDisabled,
  onSelectDay,
  onSelectTime,
}: {
  selectedDay?: Date
  selectedTime?: string
  selectedBarber?: BookingFlowBarber
  dayContextStatus: DayContextStatus
  timeList: TimeSlot[]
  maxBookingDate: Date
  isActive: boolean
  isComplete: boolean
  isDisabled: boolean
  onSelectDay: Dispatch<Date | undefined>
  onSelectTime: Dispatch<string>
}) => (
  <StepShell
    id="datetime"
    eyebrow="Etapa 04"
    title="Data e horario"
    description="Escolha uma data valida e depois um horario livre na agenda."
    isActive={isActive}
    isComplete={isComplete}
    isDisabled={isDisabled}
  >
    {isDisabled ? (
      <p className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm text-zinc-400">
        Escolha barbeiro e servico para liberar a agenda.
      </p>
    ) : (
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <CalendarDays className="h-4 w-4 text-brand-100" />
            Escolha a data
          </div>
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={onSelectDay}
            disabled={(date) =>
              date < startOfDay(new Date()) ||
              date > maxBookingDate ||
              isSundayOrBrazilHoliday(date)
            }
            locale={ptBR}
            className="mx-auto w-fit p-0"
          />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Agenda aberta por ate 4 semanas. Domingos e feriados nacionais ficam bloqueados.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Clock3 className="h-4 w-4 text-brand-100" />
              Escolha o horario
            </div>
            {selectedBarber && (
              <span className="min-w-0 truncate text-xs text-zinc-500">
                {selectedBarber.name}
              </span>
            )}
          </div>

          {!selectedDay ? (
            <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-dashed border-zinc-800 px-4 text-center text-sm text-zinc-500">
              Selecione uma data para ver os horarios disponiveis.
            </div>
          ) : dayContextStatus === "loading" ? (
            <div className="flex min-h-[136px] flex-col items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/45 px-4 text-center text-sm text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-brand-100" />
              Buscando horarios livres...
            </div>
          ) : dayContextStatus === "error" ? (
            <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-4 text-center text-sm text-red-200">
              Nao foi possivel carregar os horarios agora. Tente novamente em instantes.
            </div>
          ) : timeList.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 2xl:grid-cols-5">
              {timeList.map((slot) => (
                <Button
                  key={slot.time}
                  type="button"
                  variant={selectedTime === slot.time ? "default" : "outline"}
                  onClick={() => {
                    if (!slot.available) {
                      toast.error(slot.unavailableMessage ?? "Horario indisponivel.")
                      return
                    }

                    onSelectTime(slot.time)
                  }}
                  className={cn(
                    "h-11 rounded-lg border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-100 hover:border-brand-hover/50 hover:bg-brand/10",
                    selectedTime === slot.time &&
                      "border-brand-hover bg-brand text-white hover:bg-brand-hover",
                    !slot.available &&
                      "border-zinc-800 bg-zinc-950 text-zinc-600 hover:border-zinc-800 hover:bg-zinc-950 hover:text-zinc-600",
                  )}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/45 px-4 text-center text-sm text-zinc-400">
              Sem horarios disponiveis para esta data.
            </div>
          )}
        </div>
      </div>
    )}
  </StepShell>
)

const BookingResumeCard = ({
  profile,
  selectedBarber,
  selectedService,
  selectedDay,
  selectedDate,
  customerIsValid,
  flowError,
  isCreatingBooking,
  compact,
  onConfirm,
}: {
  profile: CustomerProfile
  selectedBarber?: BookingFlowBarber
  selectedService?: BookingFlowService
  selectedDay?: Date
  selectedDate?: Date
  customerIsValid: boolean
  flowError: string | null
  isCreatingBooking: boolean
  compact?: boolean
  onConfirm: () => void
}) => {
  const bookingIsReady = Boolean(customerIsValid && selectedBarber && selectedService && selectedDate)
  const servicePrice = selectedService ? currencyFormatter.format(Number(selectedService.price)) : null

  return (
    <aside
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/20",
        compact ? "p-3" : "p-4 sm:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-100/85">
            Etapa 05
          </p>
          <h2 className={cn("mt-1 font-bold text-zinc-50", compact ? "text-base" : "text-lg")}>
            Resumo
          </h2>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
            bookingIsReady
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
              : "border-zinc-700 bg-zinc-950/60 text-zinc-400",
          )}
        >
          {bookingIsReady ? <BadgeCheck className="h-3.5 w-3.5" /> : <Scissors className="h-3.5 w-3.5" />}
          {bookingIsReady ? "Pronto" : "Em andamento"}
        </span>
      </div>

      <div className={cn("rounded-lg border border-zinc-800 bg-zinc-950/35 px-3", compact ? "mt-3" : "mt-5")}>
        <SummaryRow
          label="Cliente"
          value={customerIsValid ? normalizeCustomerProfile(profile).name : "Aguardando"}
          isReady={customerIsValid}
          compact={compact}
        />
        {!compact && (
          <SummaryRow
            label="Telefone"
            value={customerIsValid ? formatPhone(normalizeCustomerProfile(profile).phone) : "Aguardando"}
            isReady={customerIsValid}
          />
        )}
        <SummaryRow
          label="Barbeiro"
          value={selectedBarber?.name ?? "Aguardando"}
          isReady={Boolean(selectedBarber)}
          compact={compact}
        />
        <SummaryRow
          label="Servico"
          value={selectedService?.name ?? "Aguardando"}
          isReady={Boolean(selectedService)}
          compact={compact}
        />
        {!compact && (
          <SummaryRow
            label="Valor"
            value={servicePrice ?? "Aguardando"}
            isReady={Boolean(servicePrice)}
          />
        )}
        <SummaryRow
          label="Data"
          value={
            selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
              : selectedDay
                ? "Escolha o horario"
                : "Aguardando"
          }
          isReady={Boolean(selectedDate)}
          compact={compact}
        />
        <SummaryRow
          label="Horario"
          value={selectedDate ? format(selectedDate, "HH:mm") : "Aguardando"}
          isReady={Boolean(selectedDate)}
          compact={compact}
        />
      </div>

      {flowError && (
        <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {flowError}
        </p>
      )}

      <Button
        type="button"
        onClick={onConfirm}
        disabled={!bookingIsReady || isCreatingBooking}
        className={cn(
          "w-full gap-2 rounded-lg bg-brand text-sm font-bold text-white hover:bg-brand-hover",
          compact ? "mt-3 h-11" : "mt-5 h-12",
        )}
      >
        {isCreatingBooking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirmando...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Confirmar agendamento
          </>
        )}
      </Button>

      <LgpdBookingNotice className={cn(compact ? "mt-2" : "mt-3")} />

      <p className={cn("text-center text-xs leading-relaxed text-zinc-500", compact ? "mt-2" : "mt-3")}>
        A reserva sera criada somente apos a confirmacao.
      </p>
    </aside>
  )
}

const BookingFlow = ({
  barbers,
  services,
  id,
  className,
  rootElement = "main",
}: BookingFlowProps) => {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile)
  const [selectedBarberId, setSelectedBarberId] = useState<string>()
  const [selectedServiceId, setSelectedServiceId] = useState<string>()
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [dayContextStatus, setDayContextStatus] = useState<DayContextStatus>("idle")
  const [activeStep, setActiveStep] = useState<FlowStepId>("customer")
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [flowError, setFlowError] = useState<string | null>(null)
  const [isCreatingBooking, startCreateBookingTransition] = useTransition()
  const fetchRequestIdRef = useRef(0)
  const dayContextCacheRef = useRef<Record<string, string[]>>({})
  const maxBookingDate = useMemo(() => endOfDay(addWeeks(new Date(), 4)), [])

  const normalizedProfile = useMemo(() => normalizeCustomerProfile(profile), [profile])
  const customerIsValid = isCustomerProfileValid(normalizedProfile)
  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarberId),
    [barbers, selectedBarberId],
  )
  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  )

  const selectedDate = useMemo(() => {
    if (!selectedDay || !selectedTime) {
      return undefined
    }

    const [hours, minutes] = selectedTime.split(":").map(Number)

    return set(selectedDay, {
      hours,
      minutes,
      seconds: 0,
      milliseconds: 0,
    })
  }, [selectedDay, selectedTime])

  const timeList = useMemo(() => {
    if (!selectedDay) {
      return []
    }

    return getTimeList(selectedDay, availableTimes)
  }, [availableTimes, selectedDay])

  const checkoutSteps = useMemo(
    () => [
      {
        id: "customer" as const,
        number: "01",
        title: "Seus dados",
        summary: customerIsValid ? normalizedProfile.name : "Nome e telefone com DDD",
        isComplete: customerIsValid,
        isEnabled: true,
      },
      {
        id: "barber" as const,
        number: "02",
        title: "Barbeiro",
        summary: selectedBarber?.name ?? "Escolha o profissional",
        isComplete: Boolean(selectedBarber),
        isEnabled: customerIsValid,
      },
      {
        id: "service" as const,
        number: "03",
        title: "Servico",
        summary: selectedService?.name ?? "Escolha o servico",
        isComplete: Boolean(selectedService),
        isEnabled: customerIsValid && Boolean(selectedBarber),
      },
      {
        id: "datetime" as const,
        number: "04",
        title: "Data e horario",
        summary: selectedDate
          ? `${format(selectedDate, "dd/MM", { locale: ptBR })} as ${format(selectedDate, "HH:mm")}`
          : selectedDay
            ? "Escolha um horario"
            : "Escolha data e horario",
        isComplete: Boolean(selectedDate),
        isEnabled: customerIsValid && Boolean(selectedBarber) && Boolean(selectedService),
      },
    ],
    [
      customerIsValid,
      normalizedProfile.name,
      selectedBarber,
      selectedDate,
      selectedDay,
      selectedService,
    ],
  )

  const progressSteps = useMemo(
    () => [
      {
        label: "Cliente",
        isActive: activeStep === "customer",
        isComplete: customerIsValid,
      },
      {
        label: "Barbeiro",
        isActive: activeStep === "barber",
        isComplete: Boolean(selectedBarber),
      },
      {
        label: "Servico",
        isActive: activeStep === "service",
        isComplete: Boolean(selectedService),
      },
      {
        label: "Data e hora",
        isActive: activeStep === "datetime",
        isComplete: Boolean(selectedDate),
      },
      {
        label: "Confirmar",
        isActive: activeStep === "resume",
        isComplete: false,
      },
    ],
    [activeStep, customerIsValid, selectedBarber, selectedDate, selectedService],
  )

  useEffect(() => {
    const savedProfile = parseCustomerProfile(
      window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY),
    )

    if (!savedProfile) {
      return
    }

    setProfile({
      ...savedProfile,
      phone: formatPhone(savedProfile.phone),
    })
    setActiveStep("barber")
  }, [])

  useEffect(() => {
    router.prefetch("/bookings/confirmed")
  }, [router])

  useEffect(() => {
    let isMounted = true
    const requestId = fetchRequestIdRef.current + 1
    fetchRequestIdRef.current = requestId

    const fetchDayContext = async () => {
      if (!selectedBarber || !selectedService || !selectedDay) {
        setAvailableTimes([])
        setDayContextStatus("idle")
        return
      }

      const cacheKey = `${selectedBarber.id}:${selectedService.id}:${format(selectedDay, "yyyy-MM-dd")}`
      const cachedAvailableTimes = dayContextCacheRef.current[cacheKey]

      if (cachedAvailableTimes) {
        setAvailableTimes(cachedAvailableTimes)
        setDayContextStatus("loaded")
        return
      }

      setDayContextStatus("loading")
      setAvailableTimes([])

      try {
        const context = await getBookingDayContext({
          barberId: selectedBarber.id,
          serviceId: selectedService.id,
          date: selectedDay,
        })

        if (!isMounted || requestId !== fetchRequestIdRef.current) {
          return
        }

        dayContextCacheRef.current[cacheKey] = context.availableTimes
        setAvailableTimes(context.availableTimes)
        setDayContextStatus("loaded")
      } catch (error) {
        if (!isMounted || requestId !== fetchRequestIdRef.current) {
          return
        }

        console.error("[booking-flow] failed to load day context", error)
        setAvailableTimes([])
        setDayContextStatus("error")
      }
    }

    fetchDayContext()

    return () => {
      isMounted = false
    }
  }, [selectedBarber, selectedDay, selectedService])

  useEffect(() => {
    if (!selectedTime || dayContextStatus !== "loaded") {
      return
    }

    const selectedTimeIsAvailable = timeList.some(
      (slot) => slot.time === selectedTime && slot.available,
    )

    if (!selectedTimeIsAvailable) {
      setSelectedTime(undefined)
    }
  }, [dayContextStatus, selectedTime, timeList])

  const handleCustomerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!customerIsValid) {
      const message = "Informe nome e telefone com DDD para continuar."
      setCustomerError(message)
      setFlowError(message)
      toast.error(message)
      setActiveStep("customer")
      return
    }

    window.localStorage.setItem(
      CUSTOMER_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizedProfile),
    )
    setCustomerError(null)
    setFlowError(null)
    setActiveStep("barber")
    scrollToStep("barber")
  }

  const handleSelectBarber = (barberId: string) => {
    if (selectedBarberId !== barberId) {
      setSelectedDay(undefined)
      setSelectedTime(undefined)
      setAvailableTimes([])
      setDayContextStatus("idle")
    }

    setSelectedBarberId(barberId)
    setFlowError(null)

    const nextStep = selectedServiceId ? "datetime" : "service"
    setActiveStep(nextStep)
    scrollToStep(nextStep)
  }

  const handleSelectService = (serviceId: string) => {
    if (selectedServiceId !== serviceId) {
      setSelectedTime(undefined)
      setAvailableTimes([])
      setDayContextStatus(selectedDay ? "loading" : "idle")
    }

    setSelectedServiceId(serviceId)
    setFlowError(null)
    setActiveStep("datetime")
    scrollToStep("datetime")
  }

  const handleSelectDay = (day: Date | undefined) => {
    setSelectedDay(day)
    setSelectedTime(undefined)
    setFlowError(null)

    if (day) {
      setDayContextStatus("loading")
      return
    }

    setAvailableTimes([])
    setDayContextStatus("idle")
  }

  const handleSelectTime = (time: string) => {
    setSelectedTime(time)
    setFlowError(null)
    setActiveStep("resume")

    if (!window.matchMedia("(min-width: 768px)").matches) {
      scrollToElement("booking-resume-mobile")
    }
  }

  const handleOpenStep = (stepId: FlowStepId) => {
    const step = checkoutSteps.find((item) => item.id === stepId)

    if (!step?.isEnabled) {
      return
    }

    setActiveStep(stepId)
    scrollToStep(stepId)
  }

  const getValidationMessage = () => {
    if (!customerIsValid) {
      return {
        message: "Informe nome e telefone com DDD para continuar.",
        step: "customer" as const,
      }
    }

    if (!selectedBarber) {
      return {
        message: "Escolha um barbeiro para continuar.",
        step: "barber" as const,
      }
    }

    if (!selectedService) {
      return {
        message: "Escolha um servico para continuar.",
        step: "service" as const,
      }
    }

    if (!selectedDay) {
      return {
        message: "Escolha uma data para o atendimento.",
        step: "datetime" as const,
      }
    }

    if (!selectedDate) {
      return {
        message: "Escolha um horario disponivel.",
        step: "datetime" as const,
      }
    }

    return null
  }

  const handleCreateBooking = () => {
    const validationMessage = getValidationMessage()

    if (validationMessage) {
      setFlowError(validationMessage.message)
      setActiveStep(validationMessage.step)
      toast.error(validationMessage.message)
      if (validationMessage.step === "customer") {
        setCustomerError(validationMessage.message)
      }
      scrollToStep(validationMessage.step)
      return
    }

    if (!selectedBarber || !selectedService || !selectedDate) {
      return
    }

    setFlowError(null)
    setCustomerError(null)
    window.localStorage.setItem(
      CUSTOMER_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizedProfile),
    )

    startCreateBookingTransition(async () => {
      try {
        await createBooking({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          date: selectedDate,
          customerName: normalizedProfile.name,
          customerPhone: normalizedProfile.phone,
        })

        router.push("/bookings/confirmed")
      } catch (error) {
        console.error("[booking-flow] failed to create booking", error)
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel criar o agendamento. Tente novamente."
        setFlowError(message)
        toast.error(message)
      }
    })
  }

  const renderCheckoutStep = (step: (typeof checkoutSteps)[number]) => {
    if (activeStep !== step.id) {
      return (
        <CollapsedStepCard
          key={step.id}
          id={step.id}
          number={step.number}
          title={step.title}
          summary={step.summary}
          isComplete={step.isComplete}
          isEnabled={step.isEnabled}
          onOpen={handleOpenStep}
        />
      )
    }

    switch (step.id) {
      case "customer":
        return (
          <CustomerStep
            key={step.id}
            profile={profile}
            customerError={customerError}
            isActive
            isComplete={customerIsValid}
            onChange={(nextProfile) => {
              setProfile(nextProfile)
              setCustomerError(null)
              setFlowError(null)
            }}
            onSubmit={handleCustomerSubmit}
          />
        )
      case "barber":
        return (
          <BarberStep
            key={step.id}
            barbers={barbers}
            selectedBarberId={selectedBarberId}
            isActive
            isComplete={Boolean(selectedBarber)}
            isDisabled={!customerIsValid}
            onSelectBarber={handleSelectBarber}
          />
        )
      case "service":
        return (
          <ServiceStep
            key={step.id}
            services={services}
            selectedServiceId={selectedServiceId}
            isActive
            isComplete={Boolean(selectedService)}
            isDisabled={!customerIsValid || !selectedBarber}
            onSelectService={handleSelectService}
          />
        )
      case "datetime":
        return (
          <DateTimeStep
            key={step.id}
            selectedDay={selectedDay}
            selectedTime={selectedTime}
            selectedBarber={selectedBarber}
            dayContextStatus={dayContextStatus}
            timeList={timeList}
            maxBookingDate={maxBookingDate}
            isActive
            isComplete={Boolean(selectedDate)}
            isDisabled={!customerIsValid || !selectedBarber || !selectedService}
            onSelectDay={handleSelectDay}
            onSelectTime={handleSelectTime}
          />
        )
      default:
        return null
    }
  }

  const RootElement = rootElement

  return (
    <RootElement
      id={id}
      className={cn(
        "mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:py-8",
        className,
        "pb-[calc(2rem+env(safe-area-inset-bottom))]",
      )}
    >
      <div className="mb-4 flex flex-col gap-2">
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold leading-tight text-zinc-50 sm:text-2xl">
            Reserve seu horario
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            Complete uma etapa por vez e confirme no resumo.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <CheckoutProgress steps={progressSteps} />

          {checkoutSteps.map((step) => renderCheckoutStep(step))}

          <div id="booking-resume-mobile" className="scroll-mt-24 pb-6 md:hidden">
            <BookingResumeCard
              profile={profile}
              selectedBarber={selectedBarber}
              selectedService={selectedService}
              selectedDay={selectedDay}
              selectedDate={selectedDate}
              customerIsValid={customerIsValid}
              flowError={flowError}
              isCreatingBooking={isCreatingBooking}
              compact
              onConfirm={handleCreateBooking}
            />
          </div>
        </div>

        <div className="hidden md:block">
          <div className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto">
            <BookingResumeCard
              profile={profile}
              selectedBarber={selectedBarber}
              selectedService={selectedService}
              selectedDay={selectedDay}
              selectedDate={selectedDate}
              customerIsValid={customerIsValid}
              flowError={flowError}
              isCreatingBooking={isCreatingBooking}
              onConfirm={handleCreateBooking}
            />
          </div>
        </div>
      </div>
    </RootElement>
  )
}

export default BookingFlow
