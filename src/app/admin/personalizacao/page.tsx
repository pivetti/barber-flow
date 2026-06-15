import AdminHeader from "@/features/admin/components/admin-header"
import { canManageCustomization } from "@/lib/admin-permissions"
import { getOrCreateSiteSettings } from "@/lib/site-settings"
import { requireAdmin } from "@/lib/require-admin"
import { redirect } from "next/navigation"
import SiteSettingsForm, { type SiteSettingsFormState } from "./site-settings-form"

const PersonalizacaoAdminPage = async () => {
  const admin = await requireAdmin()

  if (!canManageCustomization(admin.role)) {
    redirect("/admin/dashboard")
  }

  const settings = await getOrCreateSiteSettings()
  const initialSettings: SiteSettingsFormState = {
    businessName: settings.businessName,
    businessDescription: settings.businessDescription,
    logoUrl: settings.logoUrl,
    bannerUrl: settings.bannerUrl,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    businessEmail: settings.businessEmail,
    businessPhone: settings.businessPhone,
    whatsappPhone: settings.whatsappPhone,
    privacyEmail: settings.privacyEmail,
    privacyPhone: settings.privacyPhone,
    privacyResponsible: settings.privacyResponsible,
  }

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgb(var(--brand-primary-rgb)_/_0.14),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-100/75">
              Personalizacao
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">
              Ajustes da barbearia
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400/95">
              Configure nome, imagens, cores e contatos publicos usados no site e na Politica de Privacidade.
            </p>
          </div>
        </section>

        <SiteSettingsForm initialSettings={initialSettings} />
      </main>
    </>
  )
}

export default PersonalizacaoAdminPage
