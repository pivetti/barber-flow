import { redirect } from "next/navigation"
import { getAdminFromToken } from "./admin-auth"
import { BarberRole } from "@prisma/client"

export const requireAdmin = async () => {
  const admin = await getAdminFromToken()

  if (!admin) {
    redirect("/admin/login")
  }

  return admin
}

export const requireAdminWithRoles = async (roles: BarberRole[]) => {
  const admin = await requireAdmin()

  if (!roles.includes(admin.role)) {
    redirect("/admin/dashboard")
  }

  return admin
}
