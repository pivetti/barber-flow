"use client"

import Image from "next/image"
import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Sheet, SheetTrigger } from "./ui/sheet"
import SidebarSheet from "./sidebar-sheet"

interface HeaderClientProps {
  businessName: string
  logoUrl: string
}

const HeaderClient = ({ businessName, logoUrl }: HeaderClientProps) => {
  return (
    <header className="relative z-30 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 sm:px-6 xl:max-w-7xl">
        <Link href="/" className="group flex items-center gap-3 leading-none">
          <Image
            src={logoUrl}
            alt={businessName}
            width={136}
            height={42}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="sr-only">{businessName}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl border border-brand/20 bg-white/[0.035] text-zinc-100 shadow-sm shadow-black/25 transition-colors hover:border-brand/35 hover:bg-white/[0.07] hover:text-brand-100 focus-visible:ring-brand"
                aria-label="Abrir menu"
              >
                <MenuIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SidebarSheet businessName={businessName} logoUrl={logoUrl} />
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default HeaderClient
