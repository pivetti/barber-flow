import HeaderClient from "@/components/header-client"
import { getSafePublicImagePath } from "@/lib/safe-public-image"
import { getOrCreateSiteSettings } from "@/lib/site-settings"

const Header = async () => {
  const settings = await getOrCreateSiteSettings()
  const logoUrl = getSafePublicImagePath(settings.logoUrl, "/logo-jesi.png")

  return (
    <HeaderClient
      businessName={settings.businessName}
      logoUrl={logoUrl}
    />
  )
}

export default Header
