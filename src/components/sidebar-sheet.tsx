"use client"

import Image from "next/image"
import {
  CalendarIcon,
  HomeIcon,
  ShieldCheckIcon,
  ScissorsIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"

const SidebarSheet = () => {
  const pathname = usePathname()

  return (
    <SheetContent className={cn("w-[88%] max-w-sm overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100")}>
      <SheetHeader className="space-y-0 border-b border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950/90 p-5 pr-14">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-jesi.png"
            alt="Barbearia do Jesi"
            width={54}
            height={34}
            className="h-9 w-auto object-contain"
          />
          <div>
            <SheetTitle className="text-left text-base font-semibold text-zinc-100">
              Barbearia do Jesi
            </SheetTitle>
            <SheetDescription className="sr-only">
              Menu de navegação com links principais.
            </SheetDescription>
            <p className="text-left text-xs text-zinc-400">Navegação rápida</p>
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <section aria-label="Navegação principal" className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Navegação
          </p>

          <SheetClose asChild>
            <Link
              href="/"
              aria-label="Ir para início"
              className={cn(
                "group flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors",
                pathname === "/"
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                  : "border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
              )}
            >
              <HomeIcon className="h-4 w-4" />
              <span className="flex-1">Início</span>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/agendar"
              aria-label="Ir para agendar"
              className={cn(
                "group flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors",
                pathname.startsWith("/agendar") || pathname.startsWith("/barbers") || pathname.startsWith("/services")
                  ? "border-violet-500/40 bg-violet-500/20 text-violet-100"
                  : "border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
              )}
            >
              <ScissorsIcon className="h-4 w-4" />
              <span className="flex-1">Agendar</span>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link
              href="/bookings"
              aria-label="Ir para gerenciar agendamentos"
              className={cn(
                "group flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors",
                pathname.startsWith("/bookings")
                  ? "border-violet-500/40 bg-violet-500/20 text-violet-100"
                  : "border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="flex-1">Gerenciar agendamento</span>
            </Link>
          </SheetClose>
        </section>

        <section aria-label="Área administrativa" className="space-y-2 border-t border-zinc-800 pt-5">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Admin
          </p>

          <SheetClose asChild>
            <Link
              href="/admin/login"
              className="flex h-11 items-center gap-3 rounded-2xl border border-zinc-800/80 px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <ShieldCheckIcon className="h-4 w-4" />
              Entrar no painel
            </Link>
          </SheetClose>
        </section>
      </div>
    </SheetContent>
  )
}

export default SidebarSheet
