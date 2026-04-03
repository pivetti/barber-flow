import { Service } from "@prisma/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"

type BookingSummaryService = Pick<Service, "name"> & {
  price: Service["price"] | number | string
}

interface BookingSummaryProps {
  service: BookingSummaryService
  selectedDate: Date
  barberName?: string | null
}

const BookingSummary = ({ service, selectedDate, barberName }: BookingSummaryProps) => {
  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{service.name}</h2>
          <p className="text-sm font-bold">
            {Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(service.price))}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-400">Data</h2>
          <p className="text-sm">
            {format(selectedDate, "d 'de' MMMM", {
              locale: ptBR,
            })}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm text-gray-400">Horário</h2>
          <p className="text-sm">{format(selectedDate, "HH:mm")}</p>
        </div>

        {barberName && (
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-gray-400">Barbeiro</h2>
            <p className="text-sm">{barberName}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BookingSummary
