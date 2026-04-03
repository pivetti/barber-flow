export type AppBarberRole = "OWNER" | "ADMIN" | "BARBER"

export const canManageBarbers = (role: AppBarberRole) => role === "OWNER" || role === "ADMIN"

export const canManageServices = (role: AppBarberRole) => role === "OWNER" || role === "ADMIN"

export const canManageBookings = (role: AppBarberRole) =>
  role === "OWNER" || role === "ADMIN" || role === "BARBER"

export const canManageSchedule = (role: AppBarberRole) =>
  role === "OWNER" || role === "ADMIN" || role === "BARBER"

export const mustUseOwnDataScope = (role: AppBarberRole) => {
  void role
  return true
}
