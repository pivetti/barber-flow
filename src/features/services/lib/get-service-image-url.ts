const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

const SERVICE_IMAGE_MAP: Record<string, string> = {
  cabelo: "/services/cabelo.svg",
  "corte de cabelo": "/services/cabelo.svg",
  barba: "/services/barba.svg",
  acabamento: "/services/acabamento.svg",
  pezinho: "/services/acabamento.svg",
  massagem: "/services/massagem.svg",
  sobrancelha: "/services/sobrancelha.svg",
  hidratacao: "/services/hidratacao.svg",
}

export const getServiceImageUrl = (serviceName: string, fallbackUrl: string) => {
  const normalizedName = normalizeText(serviceName)
  return SERVICE_IMAGE_MAP[normalizedName] ?? fallbackUrl
}
