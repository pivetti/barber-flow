"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const BookingConfirmedAlert = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(false)

      const params = new URLSearchParams(searchParams.toString())
      params.delete("status")
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(nextUrl, { scroll: false })
    }, 5000)

    return () => clearTimeout(timeout)
  }, [pathname, router, searchParams])

  if (!isVisible) {
    return null
  }

  return (
    <section className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4">
      <p className="text-sm font-medium text-emerald-300">
        Agendamento confirmado com sucesso.
      </p>
    </section>
  )
}

export default BookingConfirmedAlert
