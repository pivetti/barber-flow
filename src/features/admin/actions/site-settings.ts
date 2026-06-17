"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canManageCustomization } from "@/lib/admin-permissions"
import { sanitizeText } from "@/lib/input-validation"
import { db } from "@/lib/prisma"
import {
  defaultSiteSettings,
  normalizeHexColor,
  serializeSiteSettings,
  SITE_SETTINGS_ID,
} from "@/lib/site-settings"
import { requireAdmin } from "@/lib/require-admin"

const requiredTextSchema = (min: number, max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().min(min).max(max))

const optionalTextSchema = (max: number) =>
  z.string().transform(sanitizeText).pipe(z.string().max(max))

const emailSchema = z
  .string()
  .transform((value) => sanitizeText(value).toLowerCase())
  .pipe(z.string().email().max(254))

const phoneSchema = z.string().transform(sanitizeText).pipe(z.string().min(8).max(40))
const optionalPhoneSchema = z.string().transform(sanitizeText).pipe(z.string().max(40))

const hexColorSchema = (fallback: string) =>
  z
    .string()
    .transform(sanitizeText)
    .refine((value) => /^#[0-9A-Fa-f]{6}$/.test(value), "Invalid HEX color")
    .transform((value) => normalizeHexColor(value, fallback))

const imageUrlSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(2048))
  .refine((value) => {
    if (value.length === 0) {
      return true
    }

    if (value.startsWith("/")) {
      return !value.startsWith("//") && !value.includes("..") && !/\s/.test(value)
    }

    try {
      const url = new URL(value)
      return url.protocol === "https:" || url.protocol === "http:"
    } catch {
      return false
    }
  }, "Invalid image URL")

const siteSettingsSchema = z.object({
  businessName: requiredTextSchema(2, 100),
  businessLocation: optionalTextSchema(180),
  businessDescription: optionalTextSchema(700),
  logoUrl: imageUrlSchema,
  bannerUrl: imageUrlSchema,
  primaryColor: hexColorSchema(defaultSiteSettings.primaryColor),
  secondaryColor: hexColorSchema(defaultSiteSettings.secondaryColor),
  accentColor: hexColorSchema(defaultSiteSettings.accentColor),
  backgroundGradientColor: hexColorSchema(defaultSiteSettings.backgroundGradientColor),
  businessEmail: emailSchema,
  businessPhone: phoneSchema,
  whatsappPhone: optionalPhoneSchema,
  privacyEmail: emailSchema,
  privacyPhone: phoneSchema,
  privacyResponsible: requiredTextSchema(2, 100),
})

const revalidateSiteSettingsPaths = () => {
  revalidatePath("/")
  revalidatePath("/agendar")
  revalidatePath("/barbers")
  revalidatePath("/services")
  revalidatePath("/politica-de-privacidade")
  revalidatePath("/bookings")
  revalidatePath("/bookings/confirmed")
  revalidatePath("/manage")
  revalidatePath("/admin/personalizacao")
}

export const updateSiteSettings = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageCustomization(admin.role)) {
    throw new Error("Not authorized to manage site settings")
  }

  const parsed = siteSettingsSchema.safeParse({
    businessName: String(formData.get("businessName") ?? ""),
    businessLocation: String(formData.get("businessLocation") ?? ""),
    businessDescription: String(formData.get("businessDescription") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    bannerUrl: String(formData.get("bannerUrl") ?? ""),
    primaryColor: String(formData.get("primaryColor") ?? ""),
    secondaryColor: String(formData.get("secondaryColor") ?? ""),
    accentColor: String(formData.get("accentColor") ?? ""),
    backgroundGradientColor: String(formData.get("backgroundGradientColor") ?? ""),
    businessEmail: String(formData.get("businessEmail") ?? ""),
    businessPhone: String(formData.get("businessPhone") ?? ""),
    whatsappPhone: String(formData.get("whatsappPhone") ?? ""),
    privacyEmail: String(formData.get("privacyEmail") ?? ""),
    privacyPhone: String(formData.get("privacyPhone") ?? ""),
    privacyResponsible: String(formData.get("privacyResponsible") ?? ""),
  })

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "Revise os dados informados antes de salvar.",
    }
  }

  const settingsData = {
    ...parsed.data,
    logoUrl: parsed.data.logoUrl || defaultSiteSettings.logoUrl,
    bannerUrl: parsed.data.bannerUrl || defaultSiteSettings.bannerUrl,
  }

  const settings = await db.siteSettings.upsert({
    where: {
      id: SITE_SETTINGS_ID,
    },
    update: settingsData,
    create: {
      ...defaultSiteSettings,
      ...settingsData,
      id: SITE_SETTINGS_ID,
    },
  })

  revalidateSiteSettingsPaths()

  return {
    ok: true as const,
    message: "Personalizacao salva com sucesso.",
    settings: serializeSiteSettings(settings),
  }
}
