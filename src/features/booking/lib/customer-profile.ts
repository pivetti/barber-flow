export const CUSTOMER_PROFILE_STORAGE_KEY = "barber_saas_customer_profile"

export interface CustomerProfile {
  name: string
  phone: string
}

export const normalizeCustomerProfile = (profile: CustomerProfile): CustomerProfile => ({
  name: profile.name.trim(),
  phone: profile.phone.replace(/\D/g, ""),
})

export const isCustomerProfileValid = (profile: CustomerProfile) => {
  const normalized = normalizeCustomerProfile(profile)
  return normalized.name.length >= 2 && normalized.phone.length >= 10
}

export const parseCustomerProfile = (value: string | null): CustomerProfile | null => {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<CustomerProfile>
    const normalized = normalizeCustomerProfile({
      name: parsed.name ?? "",
      phone: parsed.phone ?? "",
    })

    if (!isCustomerProfileValid(normalized)) {
      return null
    }

    return normalized
  } catch {
    return null
  }
}
