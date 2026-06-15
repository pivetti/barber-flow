"use client"

import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Home, LogOut, MenuIcon, Palette, Scissors, Users, Wrench } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import AdminLogoutButton from "./admin-logout-button"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface AdminMobileMenuProps {
  adminName: string
  links: Array<{
    href: string
    label: string
  }>
}

const AdminMobileMenu = ({ adminName, links }: AdminMobileMenuProps) => {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    for (const link of links) {
      router.prefetch(link.href)
    }
  }, [links, router])

  const isActiveLink = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const getLinkIcon = (href: string) => {
    if (href === "/admin/dashboard") return Home
    if (href === "/admin/schedule") return CalendarDays
    if (href === "/admin/services") return Wrench
    if (href === "/admin/barbers") return Users
    if (href === "/admin/personalizacao") return Palette
    return Scissors
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-100"
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Abrir menu admin</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[88%] max-w-sm border-zinc-800 bg-zinc-950 p-0">
        <SheetHeader className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950/90 p-5 text-left">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-jesi.png"
              alt="Barbearia do Jesi"
              width={54}
              height={34}
              className="h-9 w-auto object-contain"
            />
            <div className="min-w-0">
              <SheetTitle className="truncate text-zinc-100">Painel Administrativo</SheetTitle>
              <SheetDescription className="truncate text-zinc-400">Barbeiro: {adminName}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav className="space-y-2 p-5">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Navegação
          </p>

          {links.map((link) => {
            const Icon = getLinkIcon(link.href)

            return (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "group flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm font-medium transition-colors",
                    isActiveLink(link.href)
                      ? "border-brand/40 bg-brand/20 text-brand-100"
                      : "border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                </Link>
              </SheetClose>
            )
          })}

          <div className="mt-5 border-t border-zinc-800 pt-4">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Sessão
            </p>
            <AdminLogoutButton />
            <div className="pointer-events-none mt-3 flex items-center gap-2 px-1 text-xs text-zinc-500">
              <LogOut className="h-3.5 w-3.5" />
              Encerrar acesso admin
            </div>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export default AdminMobileMenu
