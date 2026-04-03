"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const AdminLogoutButton = () => {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" onClick={handleLogout}>
      Sair
    </Button>
  )
}

export default AdminLogoutButton
