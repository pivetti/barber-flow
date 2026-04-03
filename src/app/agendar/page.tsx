import Header from "@/components/header"
import CustomerIdentificationForm from "@/features/booking/components/customer-identification-form"
import { resolveSafePath } from "@/lib/safe-redirect"

interface AgendarPageProps {
  searchParams?: {
    next?: string
  }
}

const AgendarPage = ({ searchParams }: AgendarPageProps) => {
  const nextPath = resolveSafePath(searchParams?.next, {
    fallback: "/barbers",
  })

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <CustomerIdentificationForm nextPath={nextPath} />
      </main>
    </>
  )
}

export default AgendarPage
