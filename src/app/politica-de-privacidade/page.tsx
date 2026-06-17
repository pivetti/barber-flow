import { CalendarDays, LockKeyhole, ShieldCheck, UserRound } from "lucide-react"
import Header from "@/components/header"
import { getOrCreateSiteSettings } from "@/lib/site-settings"

const policySections = [
  {
    title: "Dados coletados",
    text: "Coletamos nome, telefone, servico escolhido, barbeiro, data e horario do agendamento.",
  },
  {
    title: "Finalidade",
    text: "Usamos esses dados para reservar seu horario, identificar o cliente e permitir contato sobre o atendimento.",
  },
  {
    title: "Base de uso",
    text: "O tratamento dos dados acontece para executar o agendamento solicitado pelo proprio cliente.",
  },
  {
    title: "Compartilhamento",
    text: "Os dados ficam disponiveis para a barbearia e para a equipe autorizada responsavel pela agenda e pelo atendimento.",
  },
  {
    title: "Armazenamento",
    text: "Os dados ficam guardados pelo tempo necessario para gestao dos atendimentos, historico e suporte ao cliente.",
  },
  {
    title: "Direitos do cliente",
    text: "Voce pode solicitar acesso, correcao ou exclusao dos seus dados pessoais pelos canais de contato da barbearia.",
  },
  {
    title: "Venda de dados",
    text: "Os dados pessoais informados no agendamento nao sao vendidos.",
  },
]

const PrivacyPolicyPage = async () => {
  const settings = await getOrCreateSiteSettings()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgb(var(--brand-background-rgb)_/_0.16),transparent_40%),linear-gradient(to_bottom,#09090b,#18181b_58%,#09090b)] text-zinc-50">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-zinc-800/70 bg-[linear-gradient(145deg,rgba(24,24,27,0.94),rgba(9,9,11,0.92))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.42)] sm:p-7">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand/35 bg-brand/15 text-brand-100 shadow-[0_0_32px_rgb(var(--brand-primary-rgb)_/_0.18)]">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100/80">
              Transparencia e privacidade
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">
              Politica de Privacidade
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Esta politica explica como {settings.businessName} usa os dados
              informados para realizar e gerenciar agendamentos.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4">
              <UserRound className="h-5 w-5 text-brand-100" />
              <p className="mt-3 text-sm font-semibold text-zinc-100">Dados simples</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Apenas informacoes necessarias para o atendimento.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4">
              <CalendarDays className="h-5 w-5 text-brand-100" />
              <p className="mt-3 text-sm font-semibold text-zinc-100">Uso na agenda</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Dados usados para reservar, identificar e contatar o cliente.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4">
              <LockKeyhole className="h-5 w-5 text-brand-100" />
              <p className="mt-3 text-sm font-semibold text-zinc-100">Sem venda</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Seus dados pessoais nao sao vendidos.
              </p>
            </div>
          </div>

          <div className="mt-7 divide-y divide-zinc-800/70 rounded-2xl border border-zinc-800/70 bg-zinc-900/45 px-4 sm:px-5">
            {policySections.map((section) => (
              <section key={section.title} className="py-4">
                <h2 className="text-sm font-semibold text-zinc-100">{section.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{section.text}</p>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-zinc-800/70 bg-zinc-950/45 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-zinc-100">Contato sobre dados</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Para pedir acesso, correcao ou exclusao dos seus dados, fale com{" "}
              {settings.privacyResponsible} pelo contato de privacidade:
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              <p className="rounded-xl bg-zinc-900/70 px-3 py-2">
                Privacidade:{" "}
                <span className="font-semibold text-zinc-100">
                  {settings.privacyEmail}
                </span>
              </p>
              <p className="rounded-xl bg-zinc-900/70 px-3 py-2">
                Email:{" "}
                <span className="font-semibold text-zinc-100">
                  {settings.businessEmail}
                </span>
              </p>
              <p className="rounded-xl bg-zinc-900/70 px-3 py-2">
                Telefone:{" "}
                <span className="font-semibold text-zinc-100">
                  {settings.privacyPhone || settings.businessPhone}
                </span>
              </p>
            </div>
          </section>

          <p className="mt-5 text-center text-xs leading-relaxed text-zinc-600">
            Ultima atualizacao: junho de 2026.
          </p>
        </section>
      </main>
    </div>
  )
}

export default PrivacyPolicyPage
