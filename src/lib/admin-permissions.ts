import { AdminAuthUser } from "./admin-auth"
import {
  AppBarberRole,
  canManageBarbers,
  canManageBookings,
  canManageSchedule,
  canManageServices,
  mustUseOwnDataScope,
} from "./admin-role"

export {
  canManageBarbers,
  canManageBookings,
  canManageSchedule,
  canManageServices,
  mustUseOwnDataScope,
}

export const canEditBarber = (actor: AdminAuthUser, targetRole: AppBarberRole) => {
  if (actor.role === "OWNER") {
    return true
  }

  if (actor.role === "ADMIN") {
    return targetRole !== "OWNER"
  }

  return false
}

export const canToggleBarberStatus = (
  actor: AdminAuthUser,
  targetRole: AppBarberRole,
  targetId: string,
) => {
  if (actor.id === targetId) {
    return false
  }

  if (actor.role === "OWNER") {
    return targetRole !== "OWNER"
  }

  if (actor.role === "ADMIN") {
    return targetRole !== "OWNER"
  }

  return false
}

export const canDeleteBarber = (
  actor: AdminAuthUser,
  targetRole: AppBarberRole,
  targetId: string,
) => {
  if (actor.id === targetId) {
    return false
  }

  if (actor.role === "OWNER") {
    return targetRole !== "OWNER"
  }

  if (actor.role === "ADMIN") {
    return targetRole === "BARBER"
  }

  return false
}

export const canChangeBarberRole = (
  actor: AdminAuthUser,
  targetRole: AppBarberRole,
  nextRole: AppBarberRole,
) => {
  if (targetRole === "OWNER") {
    return false
  }

  if (nextRole === "OWNER") {
    return false
  }

  if (actor.role === "OWNER") {
    return true
  }

  if (actor.role === "ADMIN") {
    return targetRole === "BARBER" && nextRole === "ADMIN"
  }

  return false
}
