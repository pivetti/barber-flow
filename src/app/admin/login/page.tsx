import AdminLoginForm from "./admin-login-form"
import Header from "@/components/header"
import { resolveSafePath } from "@/lib/safe-redirect"

interface AdminLoginPageProps {
  searchParams?: {
    next?: string
  }
}

const AdminLoginPage = ({ searchParams }: AdminLoginPageProps) => {
  const nextPath = resolveSafePath(searchParams?.next, {
    fallback: "/admin/dashboard",
    requiredPrefix: "/admin/",
  })

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(17,17,132,0.18),transparent_38%),linear-gradient(to_bottom,#09090b,#18181b_55%,#09090b)] text-zinc-50">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-6xl items-center px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto w-full max-w-md rounded-3xl border border-zinc-800/70 bg-[linear-gradient(145deg,rgba(24,24,27,0.94),rgba(9,9,11,0.92))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.42)] sm:p-6">
          <div className="mb-5 inline-flex rounded-full border border-brand/35 bg-brand/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100">
            Area administrativa
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">
              Acesse o painel
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Entre com suas credenciais para gerenciar agenda, servicos e barbeiros.
            </p>
          </div>

          <div className="mt-6">
            <AdminLoginForm nextPath={nextPath} />
          </div>

          <p className="mt-5 border-t border-zinc-800/70 pt-4 text-center text-xs text-zinc-500">
            Acesso restrito aos administradores.
          </p>
        </section>
      </main>
    </div>
  )
}

export default AdminLoginPage
