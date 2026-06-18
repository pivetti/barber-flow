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
      className="inline-flex h-[52px] w-full items-center justify-center rounded-[1.5rem] border border-brand-hover/40 bg-[#060606] px-6 text-sm font-semibold text-brand-100 shadow-[0_16px_36px_-30px_rgb(var(--brand-secondary-rgb)_/_0.85)] transition-colors hover:border-brand-100/55 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      Agendar
    </a>
  )
}

export default HomeScheduleButton
