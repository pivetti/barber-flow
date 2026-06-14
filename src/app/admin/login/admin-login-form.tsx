"use client"

import { FormEvent, useState } from "react"
import { Loader2, LockKeyhole, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ApiErrorResponse {
  error?: string
}

interface AdminLoginFormProps {
  nextPath: string
}

const AdminLoginForm = ({ nextPath }: AdminLoginFormProps) => {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = (await response.json()) as ApiErrorResponse

      if (!response.ok) {
        setErrorMessage(data.error ?? "Nao foi possivel fazer login")
        return
      }

      router.push(nextPath)
      router.refresh()
    } catch {
      setErrorMessage("Erro interno ao fazer login")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Email
        </span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="email"
            placeholder="admin@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="h-12 rounded-xl border-zinc-700/80 bg-zinc-950/60 pl-10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand/45 focus-visible:ring-offset-0"
          />
        </span>
      </label>

      <label className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Senha
        </span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="h-12 rounded-xl border-zinc-700/80 bg-zinc-950/60 pl-10 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-brand/45 focus-visible:ring-offset-0"
          />
        </span>
      </label>

      {errorMessage && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="h-12 w-full rounded-xl border border-brand/45 bg-brand text-sm font-semibold text-white shadow-[0_14px_28px_rgba(17,17,132,0.28)] hover:bg-brand-hover"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Entrando..." : "Entrar no painel"}
      </Button>
    </form>
  )
}

export default AdminLoginForm
