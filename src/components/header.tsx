"use client"

import { Button } from "./ui/button"
import { MenuIcon } from "lucide-react"
import { Sheet, SheetTrigger } from "./ui/sheet"
import SidebarSheet from "./sidebar-sheet"
import Link from "next/link"
import Image from "next/image"

const Header = () => {
  return (
    <header className="border-b border-zinc-800/80 bg-gradient-to-b from-black/70 to-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-2 sm:px-6 sm:py-3">
        <Link href="/" className="group leading-none">
          <Image
            src="/logo-jesi.png"
            alt="Barbearia do Jesi"
            width={170}
            height={52}
            className="h-12 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2">

          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-100 transition-all hover:border-violet-500/40 hover:bg-zinc-800/90 hover:text-violet-100 focus-visible:ring-violet-500"
                aria-label="Abrir menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SidebarSheet />
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Header
