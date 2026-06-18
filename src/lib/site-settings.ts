import "server-only"
import { businessConfig } from "@/config/business"
import { defaultThemeColors, legacyThemeColors } from "@/config/theme"
import { db } from "@/lib/prisma"

export const SITE_SETTINGS_ID = "default"

export const defaultSiteSettings = {
  id: SITE_SETTINGS_ID,
  businessName: businessConfig.businessName,
  businessLocation: businessConfig.businessLocation,
  businessDescription:
    "Agendamentos online para uma experiencia simples, organizada e premium.",
  logoUrl: "/logo-jesi.png",
  bannerUrl: "/banner-jesi.png",
  primaryColor: defaultThemeColors.primary,
  secondaryColor: defaultThemeColors.secondary,
  accentColor: defaultThemeColors.accent,
  backgroundGradientColor: defaultThemeColors.backgroundGradient,
  businessEmail: businessConfig.businessEmail,
  businessPhone: businessConfig.businessPhone,
  whatsappPhone: "",
  privacyEmail: businessConfig.privacyContact,
  privacyPhone: businessConfig.businessPhone,
  privacyResponsible: businessConfig.supportName,
}

export type PublicSiteSettings = typeof defaultSiteSettings & {
  createdAt?: Date
  updatedAt?: Date
}

export const normalizeHexColor = (value: string, fallback: string) => {
  const normalized = value.trim()

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return normalized.toUpperCase()
  }

  return fallback
}

const normalizeThemeColor = (value: string, fallback: string, legacyValue: string) => {
  const normalized = normalizeHexColor(value, fallback)

  return normalized === legacyValue.toUpperCase() ? fallback : normalized
}

export const hexToRgbParts = (value: string) => {
  const hex = normalizeHexColor(value, defaultSiteSettings.primaryColor).replace("#", "")
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)

  return `${red} ${green} ${blue}`
}

export const getSiteSettingsStyle = (
  settings: Pick<
    PublicSiteSettings,
    "primaryColor" | "secondaryColor" | "accentColor" | "backgroundGradientColor"
  >,
) => ({
  "--brand-primary-rgb": hexToRgbParts(settings.primaryColor),
  "--brand-secondary-rgb": hexToRgbParts(settings.secondaryColor),
  "--brand-accent-rgb": hexToRgbParts(settings.accentColor),
  "--brand-background-rgb": hexToRgbParts(settings.backgroundGradientColor),
})

export const serializeSiteSettings = (settings: PublicSiteSettings): PublicSiteSettings => ({
  id: settings.id,
  businessName: settings.businessName,
  businessLocation: settings.businessLocation,
  businessDescription: settings.businessDescription,
  logoUrl: settings.logoUrl,
  bannerUrl: settings.bannerUrl,
  primaryColor: normalizeThemeColor(
    settings.primaryColor,
    defaultThemeColors.primary,
    legacyThemeColors.primary,
  ),
  secondaryColor: normalizeThemeColor(
    settings.secondaryColor,
    defaultThemeColors.secondary,
    legacyThemeColors.secondary,
  ),
  accentColor: normalizeThemeColor(
    settings.accentColor,
    defaultThemeColors.accent,
    legacyThemeColors.accent,
  ),
  backgroundGradientColor: normalizeThemeColor(
    settings.backgroundGradientColor,
    defaultThemeColors.backgroundGradient,
    legacyThemeColors.backgroundGradient,
  ),
  businessEmail: settings.businessEmail,
  businessPhone: settings.businessPhone,
  whatsappPhone: settings.whatsappPhone,
  privacyEmail: settings.privacyEmail,
  privacyPhone: settings.privacyPhone,
  privacyResponsible: settings.privacyResponsible,
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
})

export const getSiteSettings = async () => {
  const settings = await db.siteSettings.findUnique({
    where: {
      id: SITE_SETTINGS_ID,
    },
  })

  return serializeSiteSettings(settings ?? defaultSiteSettings)
}

export const getOrCreateSiteSettings = async () => {
  const existingSettings = await db.siteSettings.findUnique({
    where: {
      id: SITE_SETTINGS_ID,
    },
  })

  if (existingSettings) {
    return serializeSiteSettings(existingSettings)
  }

  const settings = await db.siteSettings.create({
    data: {
      ...defaultSiteSettings,
    },
  }).catch(async () => {
    const latestSettings = await db.siteSettings.findUnique({
      where: {
        id: SITE_SETTINGS_ID,
      },
    })

    if (!latestSettings) {
      throw new Error("Unable to create site settings")
    }

    return latestSettings
  })

  return serializeSiteSettings(settings)
}
