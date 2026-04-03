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
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
          <h1 className="text-xl font-bold md:text-2xl">Painel Administrativo</h1>
          <p className="mt-1 text-sm text-zinc-400">Entre com seu email e senha.</p>
          <div className="mt-5">
            <AdminLoginForm nextPath={nextPath} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminLoginPage
