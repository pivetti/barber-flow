"use client"

import type { MouseEvent } from "react"

const HomeScheduleButton = () => {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("agendamento")

    if (!target) {
      return
    }

    event.preventDefault()
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
    window.history.pushState(null, "", "#agendamento")
  }

  return (
    <a
      href="#agendamento"
      onClick={handleClick}
      className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-lg shadow-brand-950/30 transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      Agendar
    </a>
  )
}

export default HomeScheduleButton
