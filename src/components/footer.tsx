import Link from "next/link"
import { getOrCreateSiteSettings } from "@/lib/site-settings"
import { Card, CardContent } from "./ui/card"

const Footer = async () => {
  const settings = await getOrCreateSiteSettings()

  return (
    <footer className="mt-auto pb-[env(safe-area-inset-bottom)]">
      <Card className="rounded-none border-x-0 border-b-0 border-zinc-800/70 bg-zinc-950/90">
        <CardContent className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>
              (c) 2026{" "}
              <span className="font-semibold text-zinc-300">
                {settings.businessName}
              </span>
            </p>
            <p className="text-xs text-zinc-600">
              {settings.businessPhone} · {settings.businessEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/politica-de-privacidade"
              className="text-xs font-medium text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-300"
            >
              Politica de Privacidade
            </Link>
          </div>
        </CardContent>
      </Card>
    </footer>
  )
}

export default Footer
