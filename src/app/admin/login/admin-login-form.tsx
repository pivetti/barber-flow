"use client"

import { FormEvent, useState } from "react"
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
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {errorMessage && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{errorMessage}</p>
      )}

      <Button
        type="submit"
        className="h-10 w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Entrando..." : "Entrar no painel"}
      </Button>
    </form>
  )
}

export default AdminLoginForm
