"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { canManageServices } from "@/lib/admin-permissions"
import { getBrasiliaTodayStart } from "@/lib/brasilia-time"
import {
  idSchema,
  sanitizeText,
  serviceDescriptionSchema,
} from "@/lib/input-validation"
import { db } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"

const DEFAULT_SERVICE_IMAGE_URL = "/logo-jesi.png"
const serviceImageInputSchema = z
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

const serviceNameSchema = z.string().transform(sanitizeText).pipe(z.string().min(2).max(80))
const priceInputSchema = z
  .string()
  .transform((value) => value.replace(",", ".").trim())
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/).max(16))

const createServiceSchema = z.object({
  name: serviceNameSchema,
  description: serviceDescriptionSchema,
  imageUrl: serviceImageInputSchema,
  price: priceInputSchema,
})

const updateServiceSchema = createServiceSchema.extend({
  serviceId: idSchema,
})

const resolveServiceImageUrl = (value?: string) => {
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

  if (normalized.startsWith("services/")) {
    return `/${normalized}`
  }

  return `/services/${normalized}`
}

const parsePrice = (value: string) => {
  const price = Number(value)

  if (Number.isNaN(price) || price <= 0 || price > 100000) {
    throw new Error("Preco invalido")
  }

  return price
}

const serializeService = (service: {
  id: string
  name: string
  description: string
  imageUrl: string
  price: { toString(): string }
}) => ({
  id: service.id,
  name: service.name,
  description: service.description,
  imageUrl: service.imageUrl,
  price: service.price.toString(),
})

export const createAdminService = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageServices(admin.role)) {
    throw new Error("Not authorized to manage services")
  }

  const parsed = createServiceSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    price: String(formData.get("price") ?? ""),
  })

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "Dados do servico invalidos.",
    }
  }

  let price: number

  try {
    price = parsePrice(parsed.data.price)
  } catch {
    return {
      ok: false as const,
      message: "Preco invalido.",
    }
  }

  const service = await db.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      imageUrl: resolveServiceImageUrl(parsed.data.imageUrl) ?? DEFAULT_SERVICE_IMAGE_URL,
      price,
    },
  })

  revalidatePath("/admin/services")
  revalidatePath("/services")

  return {
    ok: true as const,
    service: serializeService(service),
  }
}

export const updateAdminService = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageServices(admin.role)) {
    throw new Error("Not authorized to manage services")
  }

  const parsed = updateServiceSchema.safeParse({
    serviceId: String(formData.get("serviceId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    price: String(formData.get("price") ?? ""),
  })

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "Dados do servico invalidos.",
    }
  }

  let price: number

  try {
    price = parsePrice(parsed.data.price)
  } catch {
    return {
      ok: false as const,
      message: "Preco invalido.",
    }
  }

  const service = await db.service.update({
    where: {
      id: parsed.data.serviceId,
    },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      imageUrl: resolveServiceImageUrl(parsed.data.imageUrl) ?? DEFAULT_SERVICE_IMAGE_URL,
      price,
    },
  })

  revalidatePath("/admin/services")
  revalidatePath("/services")

  return {
    ok: true as const,
    service: serializeService(service),
  }
}

export const deleteAdminService = async (formData: FormData) => {
  const admin = await requireAdmin()

  if (!canManageServices(admin.role)) {
    throw new Error("Not authorized to manage services")
  }

  const parsedServiceId = idSchema.safeParse(String(formData.get("serviceId") ?? ""))
  if (!parsedServiceId.success) {
    return {
      ok: false as const,
      message: "Servico invalido.",
    }
  }

  const todayStart = getBrasiliaTodayStart()

  const serviceWithUpcomingScheduledBookings = await db.service.findUnique({
    where: { id: parsedServiceId.data },
    select: {
      id: true,
      bookings: {
        select: {
          id: true,
        },
        where: {
          status: "SCHEDULED",
          date: {
            gte: todayStart,
          },
        },
        take: 1,
      },
    },
  })

  if (serviceWithUpcomingScheduledBookings?.bookings.length) {
    return {
      ok: false as const,
      blockedServiceId: parsedServiceId.data,
      message: "Exclua primeiro os agendamentos futuros vinculados a este servico.",
    }
  }

  await db.$transaction(async (tx) => {
    await tx.booking.deleteMany({
      where: {
        serviceId: parsedServiceId.data,
      },
    })

    await tx.service.delete({
      where: { id: parsedServiceId.data },
    })
  })

  revalidatePath("/admin/services")
  revalidatePath("/services")

  return {
    ok: true as const,
  }
}
