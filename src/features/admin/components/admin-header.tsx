"use client"

import Image from "next/image"
import AdminMobileMenu from "./admin-mobile-menu"
import { AppBarberRole, canManageBarbers, canManageServices } from "@/lib/admin-role"

interface AdminHeaderProps {
  adminName: string
  adminRole: AppBarberRole
}

const AdminHeader = ({ adminName, adminRole }: AdminHeaderProps) => {
  const links = [
    { href: "/admin/dashboard", label: "Agenda" },
    { href: "/admin/schedule", label: "Horários" },
    ...(canManageServices(adminRole) ? [{ href: "/admin/services", label: "Serviços" }] : []),
    ...(canManageBarbers(adminRole) ? [{ href: "/admin/barbers", label: "Barbeiros" }] : []),
  ]

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-jesi.png"
            alt="Barbearia do Jesi"
            width={64}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-400">Painel Administrativo</p>
            <p className="text-sm text-zinc-200">Barbeiro: {adminName}</p>
          </div>
        </div>

        <AdminMobileMenu adminName={adminName} links={links} />
      </div>
    </header>
  )
}

export default AdminHeader
