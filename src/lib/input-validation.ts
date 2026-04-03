import { z } from "zod"

const controlCharsRegex = /[\u0000-\u001F\u007F]/g

export const sanitizeText = (value: string) =>
  value.replace(controlCharsRegex, "").replace(/\s+/g, " ").trim()

export const sanitizePhone = (value: string) => value.replace(/\D/g, "").trim()

export const idSchema = z.string().uuid()

export const nameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().min(2).max(80))

export const customerNameSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().min(2).max(100))

export const phoneSchema = z.string().transform(sanitizePhone).pipe(z.string().min(10).max(11))

export const emailSchema = z
  .string()
  .transform((value) => sanitizeText(value).toLowerCase())
  .pipe(z.string().email().max(254))

export const passwordSchema = z.string().min(6).max(128)

export const optionalUrlSchema = z
  .string()
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length === 0 || value.length <= 2048, "URL too long")
  .refine(
    (value) => value.length === 0 || /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Invalid URL format",
  )
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))

export const serviceDescriptionSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(600))

export const shortReasonSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(160))

export const dateInputSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const timeInputSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)

export const adminReturnToSchema = z
  .string()
  .transform((value) => sanitizeText(value))
  .refine((value) => value.length === 0 || (value.startsWith("/admin/") && value.length <= 200), {
    message: "Invalid return path",
  })
