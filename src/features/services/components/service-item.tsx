"use client"

import { Service } from "@prisma/client"
import {
  addWeeks,
  endOfDay,
  getDay,
  isPast,
  isSameDay,
  isToday,
  set,
  startOfDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { createBooking } from "@/features/booking/actions/create-booking"
import { getBookingDayContext } from "@/features/booking/actions/get-booking-day-context"
import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  parseCustomerProfile,
} from "@/features/booking/lib/customer-profile"
import BookingSummary from "@/features/booking/components/booking-summary"
import { getServiceImageUrl } from "@/features/services/lib/get-service-image-url"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

type ServiceItemModel = Pick<Service, "id" | "name" | "description" | "imageUrl"> & {
  price: Service["price"] | number | string
}

interface ServiceItemProps {
  service: ServiceItemModel
  barber: {
    id: string
    name: string
  }
}

interface GetTimeListProps {
  selectedDay: Date
  availableTimes: string[]
}

interface TimeSlot {
  time: string
  available: boolean
  unavailableMessage?: string
}

type DayContextStatus = "idle" | "loading" | "loaded" | "error"

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

  const holidays = getBrazilNationalHolidays(date.getFullYear())
  return holidays.some((holiday) => isSameDay(holiday, date))
}

const getTimeList = ({ selectedDay, availableTimes }: GetTimeListProps): TimeSlot[] => {
  if (isSundayOrBrazilHoliday(selectedDay)) {
    return []
  }

  return availableTimes.map((time) => {
    const hour = Number(time.split(":")[0])
    const minutes = Number(time.split(":")[1])

    const timeIsOnThePast = isPast(
      set(selectedDay, {
        hours: hour,
        minutes,
        seconds: 0,
        milliseconds: 0,
      }),
    )

    if (timeIsOnThePast && isToday(selectedDay)) {
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

const ServiceItem = ({ service, barber }: ServiceItemProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [bookingSheetIsOpen, setBookingSheetIsOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [dayContextStatus, setDayContextStatus] = useState<DayContextStatus>("idle")
  const fetchRequestIdRef = useRef(0)
  const dayContextCacheRef = useRef<Record<string, string[]>>({})
  const [isCreatingBooking, startCreateBookingTransition] = useTransition()
  const serviceImageUrl = getServiceImageUrl(service.name, service.imageUrl)
  const maxBookingDate = endOfDay(addWeeks(new Date(), 4))

  useEffect(() => {
    router.prefetch("/bookings/confirmed")
  }, [router])

  useEffect(() => {
    let isMounted = true
    const requestId = fetchRequestIdRef.current + 1
    fetchRequestIdRef.current = requestId

    const fetchBookings = async () => {
      if (!selectedDay) {
        setAvailableTimes([])
        setDayContextStatus("idle")
        return
      }

      const cacheKey = `${barber.id}:${selectedDay.toISOString().slice(0, 10)}`
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
          date: selectedDay,
          barberId: barber.id,
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

        console.error("[service-item] failed to load day context", error)
        setAvailableTimes([])
        setDayContextStatus("error")
      }
    }

    fetchBookings()

    return () => {
      isMounted = false
    }
  }, [barber.id, selectedDay, service.id])

  const selectedDate = useMemo(() => {
    if (!selectedDay || !selectedTime) {
      return undefined
    }

    return set(selectedDay, {
      hours: Number(selectedTime.split(":")[0]),
      minutes: Number(selectedTime.split(":")[1]),
      seconds: 0,
      milliseconds: 0,
    })
  }, [selectedDay, selectedTime])

  const timeList = useMemo(() => {
    if (!selectedDay) {
      return []
    }

    return getTimeList({
      selectedDay,
      availableTimes,
    })
  }, [availableTimes, selectedDay])

  useEffect(() => {
    if (!selectedTime) {
      return
    }

    const selectedTimeIsAvailable = timeList.some(
      (slot) => slot.time === selectedTime && slot.available,
    )

    if (!selectedTimeIsAvailable) {
      setSelectedTime(undefined)
    }
  }, [selectedTime, timeList])

  const getCurrentPathWithQuery = () => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const getSavedCustomerProfile = () =>
    parseCustomerProfile(window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY))

  const handleBookingClick = () => {
    const savedProfile = getSavedCustomerProfile()
    if (!savedProfile) {
      const nextPath = encodeURIComponent(getCurrentPathWithQuery())
      router.push(`/agendar?next=${nextPath}`)
      return
    }

    setBookingSheetIsOpen(true)
  }

  const handleSelectDay = (day: Date | undefined) => {
    setSelectedDay(day)
    setSelectedTime(undefined)

    if (day) {
      setDayContextStatus("loading")
    } else {
      setDayContextStatus("idle")
      setAvailableTimes([])
    }
  }

  const handleCreateBooking = async () => {
    const savedProfile = getSavedCustomerProfile()
    if (!savedProfile) {
      const nextPath = encodeURIComponent(getCurrentPathWithQuery())
      router.push(`/agendar?next=${nextPath}`)
      return
    }

    if (!selectedDate) {
      toast.error("Selecione data e horario")
      return
    }

    startCreateBookingTransition(async () => {
      try {
        await createBooking({
          serviceId: service.id,
          barberId: barber.id,
          date: selectedDate,
          customerName: savedProfile.name,
          customerPhone: savedProfile.phone,
        })

        setBookingSheetIsOpen(false)
        setSelectedDay(undefined)
        setSelectedTime(undefined)
        router.push("/bookings/confirmed")
      } catch (error) {
        console.error(error)

        const message =
          error instanceof Error ? error.message : "Erro ao criar reserva"
        toast.error(message)
      }
    })
  }

  return (
    <>
      <Card className="group h-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition-all duration-200 hover:border-brand/40">
        <CardContent className="flex h-full flex-col p-0">
          <div className="grid grid-cols-[44px_1fr] items-center gap-2 p-2.5 sm:grid-cols-[110px_1fr] sm:gap-4 sm:p-5">
            <div className="relative h-11 w-11 shrink-0 sm:h-[110px] sm:w-[110px]">
              <Image
                alt={service.name}
                src={serviceImageUrl}
                fill
                sizes="(max-width: 640px) 44px, 110px"
                className="rounded-xl object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </div>

            <div className="min-w-0 space-y-1.5 sm:space-y-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-zinc-100 sm:line-clamp-1 sm:text-base">
                {service.name}
              </h3>
              <p className="hidden line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:block sm:text-sm">
                {service.description}
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-zinc-800 bg-zinc-950/40 p-3 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="rounded-xl border border-brand/30 bg-brand/10 px-3 py-2 sm:px-4 sm:py-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-400 sm:text-[10px]">
                  Valor
                </p>
                <p className="text-sm font-bold text-brand-100 sm:text-base">
                  {Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(service.price))}
                </p>
              </div>

              <Button
                variant="default"
                size="default"
                onClick={handleBookingClick}
                className="h-10 w-full rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover sm:h-10 sm:w-auto sm:min-w-[132px]"
              >
                Reservar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={bookingSheetIsOpen} onOpenChange={setBookingSheetIsOpen}>
        <SheetContent className="w-[90%] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fazer reserva</SheetTitle>
            <SheetDescription className="sr-only">
              Escolha data e horario para confirmar sua reserva.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={handleSelectDay}
              disabled={(date) =>
                date < startOfDay(new Date()) ||
                date > maxBookingDate ||
                isSundayOrBrazilHoliday(date)
              }
              locale={ptBR}
              className="mx-auto mt-5"
            />

            {selectedDay && (
              <>
                {dayContextStatus === "loading" ? (
                  <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-center text-sm text-zinc-400">
                    Carregando horarios...
                  </div>
                ) : dayContextStatus === "error" ? (
                  <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-center text-sm text-red-200">
                    Nao foi possivel carregar os horarios agora. Tente novamente.
                  </div>
                ) : timeList.length > 0 ? (
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {timeList.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        onClick={() => {
                          if (!slot.available) {
                            toast.error(slot.unavailableMessage ?? "Horario indisponivel.")
                            return
                          }

                          setSelectedTime(slot.time)
                        }}
                        className={cn(
                          "w-full",
                          !slot.available &&
                            "border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-500",
                        )}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-center text-sm text-zinc-400">
                    Sem horarios disponiveis para esta data.
                  </div>
                )}
              </>
            )}

            {selectedDate && (
              <div className="mt-6">
                <BookingSummary
                  service={service}
                  selectedDate={selectedDate}
                  barberName={barber.name}
                />
              </div>
            )}
          </div>

          <SheetFooter>
            <Button
              className="h-10 rounded-xl"
              onClick={handleCreateBooking}
              disabled={!selectedDate || isCreatingBooking}
            >
              {isCreatingBooking ? "Confirmando..." : "Confirmar reserva"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ServiceItem
