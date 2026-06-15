import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import type { CSSProperties, ReactNode } from "react"
import "./globals.css"
import { Toaster } from "sonner"
import Footer from "@/components/footer"
import { getSiteSettings, getSiteSettingsStyle } from "@/lib/site-settings"

const inter = Inter({ subsets: ["latin"] })

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getSiteSettings()

  return {
    title: settings.businessName,
    description: settings.businessDescription,
    icons: {
      icon: "/logo-jesi.ico",
      shortcut: "/logo-jesi.ico",
    },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const settings = await getSiteSettings()
  const siteSettingsStyle = getSiteSettingsStyle(settings) as CSSProperties

  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className} style={siteSettingsStyle}>
        <div className="flex min-h-[100dvh] flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <Toaster closeButton duration={3000} visibleToasts={3} />
      </body>
    </html>
  )
}
