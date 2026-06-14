import { redirect } from "next/navigation"

interface BookingDetailPageProps {
  params: {
    bookingId: string
  }
}

const BookingDetailPage = ({ params }: BookingDetailPageProps) => {
  redirect(`/admin/bookings/${params.bookingId}/edit`)
}

export default BookingDetailPage
