"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"

interface PhoneMaskedInputProps {
  defaultValue: string
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

const PhoneMaskedInput = ({ defaultValue }: PhoneMaskedInputProps) => {
  const [value, setValue] = useState(formatPhone(defaultValue))

  return (
    <Input
      id="customerPhone"
      name="customerPhone"
      type="tel"
      inputMode="tel"
      placeholder="(00) 00000-0000"
      value={value}
      onChange={(event) => setValue(formatPhone(event.target.value))}
      required
      className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-100"
    />
  )
}

export default PhoneMaskedInput
