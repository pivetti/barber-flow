"use client"

import {
  addWeeks,
  endOfDay,
  format,
  getDay,
  isSameDay,
  set,
  startOfDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Phone,
  UserRound,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { Dispatch } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  getAdminBookingEditDayContext,
  updateAdminBookingWizard,
} from "@/features/admin/actions/bookings"
import {
  BookingFlowProgress,
  BookingStepShell,
  BookingSummaryRow,
} from "@/features/booking/components/booking-flow-ui"
import {
  CustomerProfile,
  isCustomerProfileValid,
  normalizeCustomerProfile,
} from "@/features/booking/lib/customer-profile"
import { getServiceImageUrl } from "@/features/services/lib/get-service-image-url"
import { cn } from "@/lib/utils"

type EditFlowStepId = "customer" | "barber" | "service" | "datetime" | "resume"
type DayContextStatus = "idle" | "loading" | "loaded" | "error"

interface AdminBookingEditBarber {
  id: string
  name: string
  imageUrl: string
}

interface AdminBookingEditService {
  id: string
  name: string
  description: string
  imageUrl: string
  price: string
  durationMinutes: number
  bufferBeforeMinutes: number
  bufferAfterMinutes: number
  isActive: boolean
}

interface AdminBookingEditFlowProps {
  booking: {
    id: string
    customerName: string
    customerPhone: string
    barberId: string
    serviceId: string
    startsAtIso: string
    startsAtDateKey: string
    startsAtTime: string
  }
  barbers: AdminBookingEditBarber[]
  services: AdminBookingEditService[]
  initialStep: EditFlowStepId
  dashboardHref: string
}

interface TimeSlot {
  time: string
  available: boolean
  unavailableMessage?: string
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const stepOrder: EditFlowStepId[] = ["customer", "barber", "service", "datetime", "resume"]

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

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const getDateKey = (date: Date) => format(date, "yyyy-MM-dd")

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

  return availableTimes.map((time) => ({
    time,
    available: true,
  }))
}

const getStepIndex = (stepId: EditFlowStepId) => stepOrder.indexOf(stepId)

const buildStartsAt = (selectedDay: Date, selectedTime: string) => {
  const [hours, minutes] = selectedTime.split(":").map(Number)

  return set(selectedDay, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  })
}

const getChangedValue = ({
  current,
  original,
}: {
  current: string
  original: string
}) => (current === original ? "" : `Antes: ${original}`)

const EditSummaryRow = ({
  label,
  value,
  previousValue,
}: {
  label: string
  value: string
  previousValue?: string
}) => (
  <div className="border-b border-zinc-800/80 py-3 last:border-b-0">
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-semibold text-zinc-100">{value}</span>
    </div>
    {previousValue && <p className="mt-1 text-right text-xs text-amber-300/85">{previousValue}</p>}
  </div>
)

const CustomerStep = ({
  profile,
  onChange,
  error,
}: {
  profile: CustomerProfile
  onChange: Dispatch<CustomerProfile>
  error: string | null
}) => (
  <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
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
        placeholder="Nome do cliente"
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

    {error && (
      <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200 sm:col-span-2">
        {error}
      </p>
    )}
  </div>
)

const BarberStep = ({
  barbers,
  selectedBarberId,
  onSelectBarber,
}: {
  barbers: AdminBookingEditBarber[]
  selectedBarberId?: string
  onSelectBarber: Dispatch<string>
}) => (
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
              sizes="(max-width: 640px) 100vw, 33vw"
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
)

const ServiceStep = ({
  services,
  selectedServiceId,
  onSelectService,
}: {
  services: AdminBookingEditService[]
  selectedServiceId?: string
  onSelectService: Dispatch<string>
}) => (
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
              {!service.isActive && (
                <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Inativo
                </span>
              )}
            </span>
          </span>
        </button>
      )
    })}
  </div>
)

const DateTimeStep = ({
  selectedDay,
  selectedTime,
  selectedBarber,
  dayContextStatus,
  timeList,
  maxBookingDate,
  onSelectDay,
  onSelectTime,
}: {
  selectedDay?: Date
  selectedTime?: string
  selectedBarber?: AdminBookingEditBarber
  dayContextStatus: DayContextStatus
  timeList: TimeSlot[]
  maxBookingDate: Date
  onSelectDay: Dispatch<Date | undefined>
  onSelectTime: Dispatch<string>
}) => (
  <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
    <div>
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
        A disponibilidade respeita expediente, bloqueios e agendamentos existentes.
      </p>
    </div>

    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Clock3 className="h-4 w-4 text-brand-100" />
          Escolha o horario
        </div>
        {selectedBarber && (
          <span className="min-w-0 truncate text-xs text-zinc-500">{selectedBarber.name}</span>
        )}
      </div>

      {!selectedDay ? (
        <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/45 px-4 text-center text-sm text-zinc-400">
          Selecione uma data para carregar os horarios.
        </div>
      ) : dayContextStatus === "loading" ? (
        <div className="flex min-h-[136px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/45 px-4 text-center text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando horarios...
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
)

const AdminBookingEditFlow = ({
  booking,
  barbers,
  services,
  initialStep,
  dashboardHref,
}: AdminBookingEditFlowProps) => {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<EditFlowStepId>(initialStep)
  const [profile, setProfile] = useState<CustomerProfile>({
    name: booking.customerName,
    phone: formatPhone(booking.customerPhone),
  })
  const [selectedBarberId, setSelectedBarberId] = useState(booking.barberId)
  const [selectedServiceId, setSelectedServiceId] = useState(booking.serviceId)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    parseDateKey(booking.startsAtDateKey),
  )
  const [selectedTime, setSelectedTime] = useState<string | undefined>(booking.startsAtTime)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [dayContextStatus, setDayContextStatus] = useState<DayContextStatus>("idle")
  const [flowError, setFlowError] = useState<string | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()
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

    return buildStartsAt(selectedDay, selectedTime)
  }, [selectedDay, selectedTime])
  const originalDate = useMemo(() => new Date(booking.startsAtIso), [booking.startsAtIso])
  const timeList = useMemo(() => {
    if (!selectedDay) {
      return []
    }

    return getTimeList(selectedDay, availableTimes)
  }, [availableTimes, selectedDay])

  const progressSteps = useMemo(
    () => [
      {
        label: "Cliente",
        isActive: activeStep === "customer",
        isComplete: customerIsValid && getStepIndex(activeStep) > 0,
      },
      {
        label: "Barbeiro",
        isActive: activeStep === "barber",
        isComplete: Boolean(selectedBarber) && getStepIndex(activeStep) > 1,
      },
      {
        label: "Servico",
        isActive: activeStep === "service",
        isComplete: Boolean(selectedService) && getStepIndex(activeStep) > 2,
      },
      {
        label: "Data e hora",
        isActive: activeStep === "datetime",
        isComplete: Boolean(selectedDate) && getStepIndex(activeStep) > 3,
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
    let isMounted = true
    const requestId = fetchRequestIdRef.current + 1
    fetchRequestIdRef.current = requestId

    const fetchDayContext = async () => {
      if (!selectedBarber || !selectedService || !selectedDay) {
        setAvailableTimes([])
        setDayContextStatus("idle")
        return
      }

      const cacheKey = `${selectedBarber.id}:${selectedService.id}:${getDateKey(selectedDay)}`
      const cachedAvailableTimes = dayContextCacheRef.current[cacheKey]

      if (cachedAvailableTimes) {
        setAvailableTimes(cachedAvailableTimes)
        setDayContextStatus("loaded")
        return
      }

      setDayContextStatus("loading")
      setAvailableTimes([])

      try {
        const context = await getAdminBookingEditDayContext({
          bookingId: booking.id,
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

        console.error("[admin-booking-edit-flow] failed to load day context", error)
        setAvailableTimes([])
        setDayContextStatus("error")
      }
    }

    fetchDayContext()

    return () => {
      isMounted = false
    }
  }, [booking.id, selectedBarber, selectedDay, selectedService])

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

  const validateStep = (step: EditFlowStepId) => {
    if (step === "customer" && !customerIsValid) {
      return "Informe nome e telefone com DDD para continuar."
    }

    if (step === "barber" && !selectedBarber) {
      return "Escolha um barbeiro para continuar."
    }

    if (step === "service" && !selectedService) {
      return "Escolha um servico para continuar."
    }

    if (step === "datetime" && (!selectedDay || !selectedDate)) {
      return "Escolha uma data e horario disponivel."
    }

    return null
  }

  const goToStep = (step: EditFlowStepId) => {
    setFlowError(null)
    setActiveStep(step)
  }

  const handleBack = () => {
    const currentIndex = getStepIndex(activeStep)

    if (currentIndex === 0) {
      router.push(dashboardHref)
      return
    }

    goToStep(stepOrder[currentIndex - 1])
  }

  const handleContinue = () => {
    const message = validateStep(activeStep)

    if (message) {
      setFlowError(message)
      if (activeStep === "customer") {
        setCustomerError(message)
      }
      toast.error(message)
      return
    }

    setCustomerError(null)
    setFlowError(null)
    goToStep(stepOrder[Math.min(getStepIndex(activeStep) + 1, stepOrder.length - 1)])
  }

  const handleSave = () => {
    const validationMessage =
      validateStep("customer") ||
      validateStep("barber") ||
      validateStep("service") ||
      validateStep("datetime")

    if (validationMessage || !selectedBarber || !selectedService || !selectedDate) {
      const message = validationMessage ?? "Revise os dados do agendamento."
      setFlowError(message)
      toast.error(message)
      return
    }

    startSaveTransition(async () => {
      try {
        const result = await updateAdminBookingWizard({
          bookingId: booking.id,
          barberId: selectedBarber.id,
          serviceId: selectedService.id,
          startsAt: selectedDate,
          customerName: normalizedProfile.name,
          customerPhone: normalizedProfile.phone,
        })

        if (!result.ok) {
          throw new Error(result.message)
        }

        toast.success("Agendamento atualizado.")
        router.push(dashboardHref)
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar as alteracoes."
        setFlowError(message)
        toast.error(message)
      }
    })
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
  }

  const handleSelectService = (serviceId: string) => {
    if (selectedServiceId !== serviceId) {
      setSelectedTime(undefined)
      setAvailableTimes([])
      setDayContextStatus(selectedDay ? "loading" : "idle")
    }

    setSelectedServiceId(serviceId)
    setFlowError(null)
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

  const renderActiveStep = () => {
    if (activeStep === "customer") {
      return (
        <BookingStepShell
          id="booking-edit-customer"
          eyebrow="Etapa 01"
          title="Cliente"
          description="Atualize nome e telefone do cliente."
          isActive
          isComplete={customerIsValid}
        >
          <CustomerStep
            profile={profile}
            onChange={(nextProfile) => {
              setProfile(nextProfile)
              setCustomerError(null)
              setFlowError(null)
            }}
            error={customerError}
          />
        </BookingStepShell>
      )
    }

    if (activeStep === "barber") {
      return (
        <BookingStepShell
          id="booking-edit-barber"
          eyebrow="Etapa 02"
          title="Barbeiro"
          description="Confirme o profissional responsavel pelo atendimento."
          isActive
          isComplete={Boolean(selectedBarber)}
        >
          <BarberStep
            barbers={barbers}
            selectedBarberId={selectedBarberId}
            onSelectBarber={handleSelectBarber}
          />
        </BookingStepShell>
      )
    }

    if (activeStep === "service") {
      return (
        <BookingStepShell
          id="booking-edit-service"
          eyebrow="Etapa 03"
          title="Servico"
          description="Escolha o servico que ficara vinculado ao agendamento."
          isActive
          isComplete={Boolean(selectedService)}
        >
          <ServiceStep
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={handleSelectService}
          />
        </BookingStepShell>
      )
    }

    if (activeStep === "datetime") {
      return (
        <BookingStepShell
          id="booking-edit-datetime"
          eyebrow="Etapa 04"
          title="Data e horario"
          description="Escolha uma data e um horario livre na agenda."
          isActive
          isComplete={Boolean(selectedDate)}
        >
          <DateTimeStep
            selectedDay={selectedDay}
            selectedTime={selectedTime}
            selectedBarber={selectedBarber}
            dayContextStatus={dayContextStatus}
            timeList={timeList}
            maxBookingDate={maxBookingDate}
            onSelectDay={handleSelectDay}
            onSelectTime={setSelectedTime}
          />
        </BookingStepShell>
      )
    }

    return (
      <BookingStepShell
        id="booking-edit-resume"
        eyebrow="Etapa 05"
        title="Confirmacao"
        description="Revise as alteracoes antes de salvar."
        isActive
        isComplete={Boolean(customerIsValid && selectedBarber && selectedService && selectedDate)}
      >
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/35 px-3">
          <EditSummaryRow
            label="Cliente"
            value={normalizedProfile.name || "Aguardando"}
            previousValue={getChangedValue({
              current: normalizedProfile.name,
              original: booking.customerName,
            })}
          />
          <EditSummaryRow
            label="Telefone"
            value={formatPhone(normalizedProfile.phone) || "Aguardando"}
            previousValue={getChangedValue({
              current: normalizedProfile.phone,
              original: booking.customerPhone,
            })}
          />
          <EditSummaryRow
            label="Barbeiro"
            value={selectedBarber?.name ?? "Aguardando"}
          />
          <EditSummaryRow
            label="Servico"
            value={selectedService?.name ?? "Aguardando"}
          />
          <EditSummaryRow
            label="Data"
            value={selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: ptBR }) : "Aguardando"}
            previousValue={
              selectedDate
                ? getChangedValue({
                    current: format(selectedDate, "yyyy-MM-dd"),
                    original: booking.startsAtDateKey,
                  })
                : undefined
            }
          />
          <EditSummaryRow
            label="Horario"
            value={selectedTime ?? "Aguardando"}
            previousValue={getChangedValue({
              current: selectedTime ?? "",
              original: booking.startsAtTime,
            })}
          />
        </div>

        {selectedService && (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
            <BookingSummaryRow
              label="Duracao"
              value={`${selectedService.durationMinutes} min`}
              isReady
            />
            <BookingSummaryRow
              label="Valor"
              value={currencyFormatter.format(Number(selectedService.price))}
              isReady
            />
            <BookingSummaryRow
              label="Inicio atual"
              value={format(originalDate, "dd/MM/yyyy HH:mm")}
              isReady
            />
          </div>
        )}

        {flowError && (
          <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {flowError}
          </p>
        )}
      </BookingStepShell>
    )
  }

  return (
    <div className="space-y-4">
      <BookingFlowProgress steps={progressSteps} />

      {renderActiveStep()}

      {activeStep !== "resume" && flowError && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {flowError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isSaving}
          className="h-11 rounded-xl border-zinc-700/80 bg-zinc-900/85 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
        >
          Voltar
        </Button>

        {activeStep === "resume" ? (
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 rounded-xl border border-brand/35 bg-brand/15 px-5 text-sm font-semibold text-brand-100 hover:bg-brand/25"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="mr-1.5 h-4 w-4" />
            )}
            {isSaving ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleContinue}
            className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Continuar
          </Button>
        )}
      </div>
    </div>
  )
}

export default AdminBookingEditFlow
