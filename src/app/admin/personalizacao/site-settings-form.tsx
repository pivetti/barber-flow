"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { Check, Loader2, Palette, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateSiteSettings } from "@/features/admin/actions/site-settings"
import { cn } from "@/lib/utils"

export interface SiteSettingsFormState {
  businessName: string
  businessLocation: string
  businessDescription: string
  logoUrl: string
  bannerUrl: string
  primaryColor: string
  secondaryColor: string
  businessEmail: string
  businessPhone: string
  whatsappPhone: string
  privacyEmail: string
  privacyPhone: string
  privacyResponsible: string
}

interface SiteSettingsFormProps {
  initialSettings: SiteSettingsFormState
}

type TextInputKey = Exclude<keyof SiteSettingsFormState, "businessDescription">

const fieldLabelClassName =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500"
const inputClassName =
  "h-11 border-zinc-700/80 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand/50 focus-visible:ring-offset-0"

const getPreviewUrl = (value: string, fallback: string) => {
  const normalized = value.trim()

  if (normalized.startsWith("/") || /^https?:\/\/\S+$/i.test(normalized)) {
    return normalized
  }

  return fallback
}

const getColorInputValue = (value: string, fallback: string) => {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback
}

const DEFAULT_PRIMARY_COLOR = "#111184"
const DEFAULT_SECONDARY_COLOR = "#1B1BA3"

const createSettingsFormData = (settings: SiteSettingsFormState) => {
  const formData = new FormData()

  for (const [key, value] of Object.entries(settings)) {
    formData.set(key, value)
  }

  return formData
}

const SiteSettingsForm = ({ initialSettings }: SiteSettingsFormProps) => {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const logoPreviewUrl = getPreviewUrl(settings.logoUrl, "/logo-jesi.png")
  const bannerPreviewUrl = getPreviewUrl(settings.bannerUrl, "/banner-jesi.png")
  const primaryColorInputValue = getColorInputValue(settings.primaryColor, DEFAULT_PRIMARY_COLOR)
  const secondaryColorInputValue = getColorInputValue(
    settings.secondaryColor,
    DEFAULT_SECONDARY_COLOR,
  )

  const updateField = (field: TextInputKey, value: string) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSaving) {
      return
    }

    setIsSaving(true)

    try {
      const result = await updateSiteSettings(createSettingsFormData(settings))

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setSettings({
        businessName: result.settings.businessName,
        businessLocation: result.settings.businessLocation,
        businessDescription: result.settings.businessDescription,
        logoUrl: result.settings.logoUrl,
        bannerUrl: result.settings.bannerUrl,
        primaryColor: result.settings.primaryColor,
        secondaryColor: result.settings.secondaryColor,
        businessEmail: result.settings.businessEmail,
        businessPhone: result.settings.businessPhone,
        whatsappPhone: result.settings.whatsappPhone,
        privacyEmail: result.settings.privacyEmail,
        privacyPhone: result.settings.privacyPhone,
        privacyResponsible: result.settings.privacyResponsible,
      })
      toast.success(result.message)
      router.refresh()
    } catch {
      toast.error("Nao foi possivel salvar a personalizacao.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mt-5 rounded-3xl border border-zinc-800/65 bg-[radial-gradient(circle_at_top_right,rgb(var(--brand-primary-rgb)_/_0.14),transparent_38%),linear-gradient(to_bottom,rgba(24,24,27,0.92),rgba(9,9,11,0.9))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.3)] sm:mt-6 sm:p-6"
    >
      <div className="grid gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/70">
                Identidade
              </p>
              <h2 className="text-lg font-semibold text-zinc-100">Dados essenciais da barbearia</h2>
            </div>
            <span className="hidden rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 sm:inline-flex">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Registro unico
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className={fieldLabelClassName}>Nome da barbearia</span>
              <Input
                name="businessName"
                value={settings.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>

            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>Logo</span>
              <Input
                name="logoUrl"
                value={settings.logoUrl}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                placeholder="/logo-jesi.png ou https://..."
                disabled={isSaving}
                className={inputClassName}
              />
            </label>

            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>Banner</span>
              <Input
                name="bannerUrl"
                value={settings.bannerUrl}
                onChange={(event) => updateField("bannerUrl", event.target.value)}
                placeholder="/banner-jesi.png ou https://..."
                disabled={isSaving}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/60">
              <div className="flex h-24 items-center justify-center p-4">
                <Image
                  src={logoPreviewUrl}
                  alt="Preview da logo"
                  width={180}
                  height={64}
                  className="max-h-16 w-auto object-contain"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/60">
              <Image
                src={bannerPreviewUrl}
                alt="Preview do banner"
                width={520}
                height={180}
                className="h-24 w-full object-cover"
              />
            </div>
          </div>
        </section>

        <div className="h-px bg-zinc-800/75" />

        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/70">
              Cores
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">Marca e botoes principais</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className={fieldLabelClassName}>Cor principal</span>
              <div className="flex h-11 items-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-950/70 px-2">
                <input
                  type="color"
                  name="primaryColor"
                  value={primaryColorInputValue}
                  onChange={(event) => updateField("primaryColor", event.target.value.toUpperCase())}
                  disabled={isSaving}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-transparent p-0"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(event) => updateField("primaryColor", event.target.value)}
                  disabled={isSaving}
                  className="h-8 border-0 bg-transparent px-0 text-xs uppercase focus-visible:ring-0"
                />
              </div>
            </label>

            <label className="space-y-1.5">
              <span className={fieldLabelClassName}>Cor secundaria</span>
              <div className="flex h-11 items-center gap-2 rounded-md border border-zinc-700/80 bg-zinc-950/70 px-2">
                <input
                  type="color"
                  name="secondaryColor"
                  value={secondaryColorInputValue}
                  onChange={(event) => updateField("secondaryColor", event.target.value.toUpperCase())}
                  disabled={isSaving}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-transparent p-0"
                />
                <Input
                  value={settings.secondaryColor}
                  onChange={(event) => updateField("secondaryColor", event.target.value)}
                  disabled={isSaving}
                  className="h-8 border-0 bg-transparent px-0 text-xs uppercase focus-visible:ring-0"
                />
              </div>
            </label>
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/55 p-3"
            style={{
              background: `linear-gradient(135deg, ${primaryColorInputValue}2E, ${secondaryColorInputValue}14)`,
            }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">Preview da acao principal</p>
              <p className="text-xs text-zinc-500">As cores sao aplicadas por CSS variables.</p>
            </div>
            <span
              className="inline-flex h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: primaryColorInputValue }}
            >
              <Palette className="mr-2 h-4 w-4" />
              Marca
            </span>
          </div>
        </section>

        <div className="h-px bg-zinc-800/75" />

        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/70">
              Contato
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">Canais publicos</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>E-mail</span>
              <Input
                type="email"
                name="businessEmail"
                value={settings.businessEmail}
                onChange={(event) => updateField("businessEmail", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>Telefone</span>
              <Input
                name="businessPhone"
                value={settings.businessPhone}
                onChange={(event) => updateField("businessPhone", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>
            <label className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className={fieldLabelClassName}>WhatsApp</span>
              <Input
                name="whatsappPhone"
                value={settings.whatsappPhone}
                onChange={(event) => updateField("whatsappPhone", event.target.value)}
                placeholder="Apenas se for diferente do telefone principal"
                disabled={isSaving}
                className={inputClassName}
              />
            </label>
          </div>
        </section>

        <div className="h-px bg-zinc-800/75" />

        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/70">
              LGPD
            </p>
            <h2 className="text-lg font-semibold text-zinc-100">Contato de privacidade</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className={fieldLabelClassName}>Responsavel</span>
              <Input
                name="privacyResponsible"
                value={settings.privacyResponsible}
                onChange={(event) => updateField("privacyResponsible", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>E-mail LGPD</span>
              <Input
                type="email"
                name="privacyEmail"
                value={settings.privacyEmail}
                onChange={(event) => updateField("privacyEmail", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className={fieldLabelClassName}>Telefone LGPD</span>
              <Input
                name="privacyPhone"
                value={settings.privacyPhone}
                onChange={(event) => updateField("privacyPhone", event.target.value)}
                disabled={isSaving}
                required
                className={inputClassName}
              />
            </label>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800/75 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-zinc-500">
          Ao salvar, as paginas publicas e a Politica de Privacidade passam a usar estes dados.
        </p>
        <Button
          type="submit"
          disabled={isSaving}
          className={cn(
            "h-11 w-full rounded-xl border border-brand/35 bg-brand text-white hover:bg-brand-hover sm:w-auto",
            isSaving && "opacity-80",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar personalizacao
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default SiteSettingsForm
