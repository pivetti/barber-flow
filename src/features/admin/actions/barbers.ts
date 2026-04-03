"use server"

import bcrypt from "bcrypt"
import { BarberRole, Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  canChangeBarberRole,
  canDeleteBarber,
  canEditBarber,
  canManageBarbers,
  canToggleBarberStatus,
} from "@/lib/admin-permissions"
import {
  emailSchema,
  idSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  sanitizeText,
} from "@/lib/input-validation"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

const BARBER_DEFAULT_IMAGE_URL = "/logo-jesi.png"
const barberImageInputSchema = z
  .string()
  .transform(sanitizeText)
  .refine((value) => value.length === 0 || value.length <= 255, "Invalid image path")
  .refine((value) => !value.includes(".."), "Invalid image path")
  .refine(
    (value) => value.length === 0 || /^[a-zA-Z0-9/_\-.:]+$/.test(value),
    "Invalid image path",
  )
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))

const optionalPhoneSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length === 0 || value.length <= 20, "Invalid phone")
  .transform((value) => (value.length === 0 ? undefined : value))
  .pipe(phoneSchema.optional())

const createBarberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: passwordSchema,
  imageUrl: barberImageInputSchema,
  role: z.enum(["ADMIN", "BARBER"]),
})

const updateBarberSchema = z.object({
  barberId: idSchema,
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: z
    .string()
    .transform((value) => value.trim())
    .transform((value) => (value.length > 0 ? value : undefined))
    .pipe(passwordSchema.optional()),
  imageUrl: barberImageInputSchema,
})

const changeRoleSchema = z.object({
  barberId: idSchema,
  role: z.enum(["ADMIN", "BARBER"]),
})

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").trim()
  return digits.length > 0 ? digits : null
}

const resolveBarberImageUrl = (value?: string) => {
  if (!value) {
    return undefined
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    return value
  }

  const normalized = value.replace(/\\/g, "/").replace(/^\.?\/*/, "")
  if (!normalized) {
    return undefined
  }

  if (normalized.startsWith("barbers/")) {
    return `/${normalized}`
  }

  return `/barbers/${normalized}`
}

const revalidateBarberPages = () => {
  revalidatePath("/")
  revalidatePath("/barbers")
  revalidatePath("/bookings")
  revalidatePath("/sobre-nos")
  revalidatePath("/services")
  revalidatePath("/admin/barbers")
  revalidatePath("/admin/barbers/new")
}

const parseUniqueError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "")

    if (target.includes("email")) {
      throw new Error("Email já cadastrado")
    }

    if (target.includes("phone")) {
      throw new Error("Telefone já cadastrado")
    }

    throw new Error("Já existe um barbeiro com esses dados")
  }
}

export const createBarber = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    throw new Error("Not authorized to manage barbers")
  }

  const parsed = createBarberSchema.safeParse({
    name: sanitizeText(String(formData.get("name") ?? "")),
    email: sanitizeText(String(formData.get("email") ?? "")),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    role: String(formData.get("role") ?? "BARBER"),
  })

  if (!parsed.success) {
    throw new Error("Invalid barber data")
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  try {
    await db.barber.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: normalizePhone(parsed.data.phone ?? ""),
        password: passwordHash,
        imageUrl: resolveBarberImageUrl(parsed.data.imageUrl) ?? BARBER_DEFAULT_IMAGE_URL,
        role: parsed.data.role,
        isActive: true,
      },
    })
  } catch (error) {
    parseUniqueError(error)
    throw error
  }

  revalidateBarberPages()
  redirect("/admin/barbers")
}

export const updateBarber = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    throw new Error("Not authorized to manage barbers")
  }

  const parsed = updateBarberSchema.safeParse({
    barberId: String(formData.get("barberId") ?? ""),
    name: sanitizeText(String(formData.get("name") ?? "")),
    email: sanitizeText(String(formData.get("email") ?? "")),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
  })

  if (!parsed.success) {
    throw new Error("Invalid barber data")
  }

  const target = await db.barber.findUnique({
    where: { id: parsed.data.barberId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!target) {
    throw new Error("Barber not found")
  }

  if (!canEditBarber(admin, target.role)) {
    throw new Error("Not authorized to edit this barber")
  }

  const data: Prisma.BarberUpdateInput = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: normalizePhone(parsed.data.phone ?? ""),
    imageUrl: resolveBarberImageUrl(parsed.data.imageUrl) ?? BARBER_DEFAULT_IMAGE_URL,
  }

  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 12)
    data.sessionVersion = {
      increment: 1,
    }
  }

  try {
    await db.barber.update({
      where: { id: target.id },
      data,
    })
  } catch (error) {
    parseUniqueError(error)
    throw error
  }

  revalidateBarberPages()
  revalidatePath(`/admin/barbers/${target.id}/edit`)
  redirect("/admin/barbers")
}

export const toggleBarberStatus = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    throw new Error("Not authorized to manage barbers")
  }

  const parsedBarberId = idSchema.safeParse(String(formData.get("barberId") ?? ""))
  if (!parsedBarberId.success) {
    return
  }
  const barberId = parsedBarberId.data

  const target = await db.barber.findUnique({
    where: { id: barberId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  if (!target) {
    return
  }

  if (!canToggleBarberStatus(admin, target.role, target.id)) {
    throw new Error("Not authorized to toggle this barber")
  }

  await db.barber.update({
    where: { id: target.id },
    data: {
      isActive: !target.isActive,
    },
  })

  revalidateBarberPages()
}

export const changeBarberRole = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    throw new Error("Not authorized to manage barbers")
  }

  const parsed = changeRoleSchema.safeParse({
    barberId: String(formData.get("barberId") ?? ""),
    role: String(formData.get("role") ?? ""),
  })

  if (!parsed.success) {
    throw new Error("Invalid role update")
  }

  const target = await db.barber.findUnique({
    where: { id: parsed.data.barberId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!target) {
    throw new Error("Barber not found")
  }

  const nextRole = parsed.data.role as BarberRole

  if (admin.id === target.id) {
    throw new Error("Cannot change your own role")
  }

  if (!canChangeBarberRole(admin, target.role, nextRole)) {
    throw new Error("Not authorized to change this role")
  }

  await db.barber.update({
    where: { id: target.id },
    data: {
      role: nextRole,
    },
  })

  revalidateBarberPages()
}

export const deleteBarber = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    throw new Error("Not authorized to manage barbers")
  }

  const parsedBarberId = idSchema.safeParse(String(formData.get("barberId") ?? ""))
  if (!parsedBarberId.success) {
    throw new Error("Invalid barber")
  }

  const barberId = parsedBarberId.data

  const target = await db.barber.findUnique({
    where: { id: barberId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!target) {
    throw new Error("Barber not found")
  }

  if (!canDeleteBarber(admin, target.role, target.id)) {
    throw new Error("Not authorized to delete this barber")
  }

  const bookingsCount = await db.booking.count({
    where: {
      barberId: target.id,
    },
  })

  if (bookingsCount > 0) {
    throw new Error("Nao e possivel excluir um barbeiro com agendamentos vinculados")
  }

  await db.barber.delete({
    where: { id: target.id },
  })

  revalidateBarberPages()
  revalidatePath(`/admin/barbers/${target.id}/edit`)
  redirect("/admin/barbers")
}
