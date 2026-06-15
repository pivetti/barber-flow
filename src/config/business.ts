export const businessConfig = {
  businessName: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Barbearia do Jesi",
  businessLocation: process.env.NEXT_PUBLIC_BUSINESS_LOCATION ?? "",
  businessEmail:
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "contato@barbeariadojesi.com.br",
  businessPhone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "(00) 00000-0000",
  privacyContact:
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT ??
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL ??
    "privacidade@barbeariadojesi.com.br",
  supportName: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Barbearia do Jesi",
}
