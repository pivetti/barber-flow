"use server"

import { canManageBookings } from "@/lib/admin-permissions"
import { requireAdmin } from "@/lib/require-admin"
import { getDashboardMonthBookings } from "@/app/admin/dashboard/get-dashboard-month-bookings"

export const getAdminDashboardMonthBookings = async (dateKey: string) => {
  const admin = await requireAdmin()

  if (!canManageBookings(admin.role)) {
    throw new Error("Not authorized to manage bookings")
  }

  return getDashboardMonthBookings({
    barberId: admin.id,
    dateKey,
  })
}
