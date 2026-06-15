"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LgpdBookingNoticeProps {
  className?: string
}

const LgpdBookingNotice = ({ className }: LgpdBookingNoticeProps) => (
  <p className={cn("text-center text-xs leading-relaxed text-zinc-500", className)}>
    Ao agendar, voce concorda que seus dados sejam usados para reservar seu horario e
    permitir contato sobre o atendimento. Consulte nossa{" "}
    <Link
      href="/politica-de-privacidade"
      className="font-medium text-brand-100 underline underline-offset-4 transition-colors hover:text-brand-50"
    >
      Politica de Privacidade
    </Link>
    .
  </p>
)

export default LgpdBookingNotice
