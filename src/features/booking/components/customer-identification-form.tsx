"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CUSTOMER_PROFILE_STORAGE_KEY,
  CustomerProfile,
  isCustomerProfileValid,
  normalizeCustomerProfile,
  parseCustomerProfile,
} from "@/features/booking/lib/customer-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CustomerIdentificationFormProps {
  nextPath: string
}

const emptyProfile: CustomerProfile = {
  name: "",
  phone: "",
}

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

const CustomerIdentificationForm = ({ nextPath }: CustomerIdentificationFormProps) => {
  const router = useRouter()
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile)

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
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedProfile = normalizeCustomerProfile({
      ...profile,
      phone: profile.phone.replace(/\D/g, ""),
    })

    if (!isCustomerProfileValid(normalizedProfile)) {
      toast.error("Informe nome e telefone com DDD para continuar")
      return
    }

    window.localStorage.setItem(
      CUSTOMER_PROFILE_STORAGE_KEY,
      JSON.stringify(normalizedProfile),
    )

    router.push(nextPath)
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <h1 className="text-xl font-bold md:text-2xl">Antes de agendar</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Informe apenas nome e telefone para seguir ao agendamento.
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <Input
          placeholder="Seu nome"
          value={profile.name}
          onChange={(event) =>
            setProfile((previous) => ({
              ...previous,
              name: event.target.value,
            }))
          }
          required
        />

        <Input
          type="tel"
          placeholder="(00) 00000-0000"
          inputMode="tel"
          value={profile.phone}
          onChange={(event) =>
            setProfile((previous) => ({
              ...previous,
              phone: formatPhone(event.target.value),
            }))
          }
          required
        />

        <Button type="submit" className="h-10 w-full sm:w-auto">
          Continuar para agendamento
        </Button>
      </form>
    </section>
  )
}

export default CustomerIdentificationForm
