import Link from "next/link"
import { redirect } from "next/navigation"
import AdminHeader from "@/features/admin/components/admin-header"
import { createBarber } from "@/features/admin/actions/barbers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canManageBarbers } from "@/lib/admin-permissions"
import { requireAdmin } from "@/lib/require-admin"

const NewBarberPage = async () => {
  const admin = await requireAdmin()

  if (!canManageBarbers(admin.role)) {
    redirect("/admin/dashboard")
  }

  return (
    <>
      <AdminHeader adminName={admin.name} adminRole={admin.role} />

      <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-zinc-800/60 bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),transparent_42%),linear-gradient(to_bottom,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.34)] sm:p-6">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/75">Cadastro</p>
            <h1 className="text-2xl font-semibold leading-tight text-zinc-50 md:text-3xl">Novo barbeiro</h1>
            <p className="text-sm leading-relaxed text-zinc-400/95">
              Crie um novo acesso de barbeiro para o painel administrativo.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
          <form action={createBarber} className="grid gap-3 md:grid-cols-2 rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 sm:p-5">
            <Input name="name" placeholder="Nome" required className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100" />
            <Input
              name="email"
              type="email"
              placeholder="E-mail"
              required
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input name="phone" placeholder="Telefone" className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100" />
            <Input
              name="password"
              type="password"
              placeholder="Senha"
              required
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="imageUrl"
              placeholder="Imagem: joao.png ou /barbers/joao.png (opcional)"
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
            />
            <p className="text-xs text-zinc-500 md:col-span-2">
              Dica: coloque a imagem em `public/barbers` e informe apenas o nome do arquivo.
            </p>

            <label className="text-sm text-zinc-300 md:col-span-2">
              Perfil
              <select
                name="role"
                defaultValue="BARBER"
                className="mt-1 block h-10 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-3 text-zinc-100"
              >
                <option value="BARBER">Barber</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            <div className="mt-2 flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" className="rounded-xl border border-violet-500/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25">
                Criar barbeiro
              </Button>
              <Link
                href="/admin/barbers"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/85 px-4 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
              >
                Voltar
              </Link>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default NewBarberPage
