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
    <header className="border-b border-zinc-800/80 bg-gradient-to-b from-black/70 to-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 sm:px-6 sm:py-3 xl:max-w-7xl">
        <Link href="/" className="group flex items-center gap-3 leading-none">
          <Image
            src={logoUrl}
            alt={businessName}
            width={170}
            height={52}
            className="h-12 w-auto object-contain"
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
                className="h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-100 transition-all hover:border-brand/40 hover:bg-zinc-800/90 hover:text-brand-100 focus-visible:ring-brand"
                aria-label="Abrir menu"
              >
                <MenuIcon className="h-5 w-5" />
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
