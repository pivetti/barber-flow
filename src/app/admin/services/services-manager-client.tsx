"use client"

import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAdminService, deleteAdminService, updateAdminService } from "@/features/admin/actions/services"
import { cn } from "@/lib/utils"

export interface AdminServiceItem {
  id: string
  name: string
  description: string
  imageUrl: string
  price: string
  durationMinutes: string
  bufferBeforeMinutes: string
  bufferAfterMinutes: string
  isActive: boolean
}

interface ServicesManagerClientProps {
  initialServices: AdminServiceItem[]
}

interface ServiceFormState {
  name: string
  price: string
  description: string
  imageUrl: string
  durationMinutes: string
  bufferBeforeMinutes: string
  bufferAfterMinutes: string
}

type PendingAction =
  | { type: "create" }
  | { type: "update"; serviceId: string }
  | { type: "delete"; serviceId: string }
  | null

const emptyServiceForm: ServiceFormState = {
  name: "",
  price: "",
  description: "",
  imageUrl: "",
  durationMinutes: "30",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
}
const durationOptions = ["10", "15", "20", "30", "45", "60", "75", "90", "120"]
const bufferOptions = ["0", "5", "10", "15", "20", "30"]

const sortServices = (services: AdminServiceItem[]) => {
  return [...services].sort((left, right) => left.name.localeCompare(right.name))
}

const createServiceFormData = (service: ServiceFormState, serviceId?: string) => {
  const formData = new FormData()

  if (serviceId) {
    formData.set("serviceId", serviceId)
  }

  formData.set("name", service.name)
  formData.set("price", service.price)
  formData.set("description", service.description)
  formData.set("imageUrl", service.imageUrl)
  formData.set("durationMinutes", service.durationMinutes)
  formData.set("bufferBeforeMinutes", service.bufferBeforeMinutes)
  formData.set("bufferAfterMinutes", service.bufferAfterMinutes)

  return formData
}

const ServicesManagerClient = ({ initialServices }: ServicesManagerClientProps) => {
  const router = useRouter()
  const [services, setServices] = useState(() => sortServices(initialServices))
  const [newService, setNewService] = useState<ServiceFormState>(emptyServiceForm)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const pendingCreate = pendingAction?.type === "create"

  const updateServiceField = (
    serviceId: string,
    field: keyof ServiceFormState,
    value: string,
  ) => {
    setServices((currentServices) =>
      currentServices.map((service) =>
        service.id === serviceId ? { ...service, [field]: value } : service,
      ),
    )
  }

  const handleCreateService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (pendingAction) {
      return
    }

    setPendingAction({ type: "create" })

    try {
      const result = await createAdminService(createServiceFormData(newService))

      if (!result.ok) {
        toast.error(result.message ?? "Nao foi possivel criar o servico.")
        return
      }

      setServices((currentServices) => sortServices([...currentServices, result.service]))
      setNewService(emptyServiceForm)
      toast.success("Servico criado com sucesso.")
      router.refresh()
    } catch {
      toast.error("Nao foi possivel criar o servico.")
    } finally {
      setPendingAction(null)
    }
  }

  const handleUpdateService = async (
    event: React.FormEvent<HTMLFormElement>,
    service: AdminServiceItem,
  ) => {
    event.preventDefault()

    if (pendingAction) {
      return
    }

    setPendingAction({ type: "update", serviceId: service.id })

    try {
      const result = await updateAdminService(createServiceFormData(service, service.id))

      if (!result.ok) {
        toast.error(result.message ?? "Nao foi possivel salvar as alteracoes.")
        return
      }

      setServices((currentServices) =>
        sortServices(
          currentServices.map((currentService) =>
            currentService.id === service.id ? result.service : currentService,
          ),
        ),
      )
      toast.success("Servico atualizado com sucesso.")
      router.refresh()
    } catch {
      toast.error("Nao foi possivel salvar as alteracoes.")
    } finally {
      setPendingAction(null)
    }
  }

  const handleDeleteService = async (service: AdminServiceItem) => {
    if (pendingAction) {
      return
    }

    const confirmed = window.confirm(`Desativar o servico "${service.name}"?`)

    if (!confirmed) {
      return
    }

    setPendingAction({ type: "delete", serviceId: service.id })

    try {
      const formData = new FormData()
      formData.set("serviceId", service.id)

      const result = await deleteAdminService(formData)

      if (!result.ok) {
        toast.error(result.message ?? "Nao foi possivel excluir o servico.")
        return
      }

      setServices((currentServices) =>
        currentServices.map((currentService) =>
          currentService.id === service.id
            ? {
                ...currentService,
                isActive: false,
              }
            : currentService,
        ),
      )
      toast.success("Servico desativado com sucesso.")
      router.refresh()
    } catch {
      toast.error("Nao foi possivel excluir o servico.")
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <>
      <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
        <div className="rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] sm:p-5">
          <h2 className="text-lg font-semibold text-zinc-100">Novo servico</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateService}>
            <Input
              name="name"
              placeholder="Nome"
              required
              value={newService.name}
              disabled={pendingCreate}
              onChange={(event) => setNewService((service) => ({ ...service, name: event.target.value }))}
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="price"
              placeholder="Preco (ex: 59.90)"
              required
              value={newService.price}
              disabled={pendingCreate}
              onChange={(event) => setNewService((service) => ({ ...service, price: event.target.value }))}
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Duracao
              </span>
              <select
                name="durationMinutes"
                value={newService.durationMinutes}
                disabled={pendingCreate}
                onChange={(event) =>
                  setNewService((service) => ({ ...service, durationMinutes: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} min
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Buffer antes
              </span>
              <select
                name="bufferBeforeMinutes"
                value={newService.bufferBeforeMinutes}
                disabled={pendingCreate}
                onChange={(event) =>
                  setNewService((service) => ({ ...service, bufferBeforeMinutes: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
              >
                {bufferOptions.map((buffer) => (
                  <option key={buffer} value={buffer}>
                    {buffer} min
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Buffer depois
              </span>
              <select
                name="bufferAfterMinutes"
                value={newService.bufferAfterMinutes}
                disabled={pendingCreate}
                onChange={(event) =>
                  setNewService((service) => ({ ...service, bufferAfterMinutes: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
              >
                {bufferOptions.map((buffer) => (
                  <option key={buffer} value={buffer}>
                    {buffer} min
                  </option>
                ))}
              </select>
            </label>
            <Input
              name="description"
              placeholder="Descricao (opcional)"
              value={newService.description}
              disabled={pendingCreate}
              onChange={(event) =>
                setNewService((service) => ({ ...service, description: event.target.value }))
              }
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
            />
            <Input
              name="imageUrl"
              placeholder="Imagem: corte.png ou /services/corte.png (opcional)"
              value={newService.imageUrl}
              disabled={pendingCreate}
              onChange={(event) => setNewService((service) => ({ ...service, imageUrl: event.target.value }))}
              className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
            />
            <p className="text-xs text-zinc-500 md:col-span-2">
              Dica: coloque a imagem em `public/services` e informe apenas o nome do arquivo.
            </p>
            <Button
              type="submit"
              disabled={pendingCreate}
              className="md:col-span-2 md:w-fit rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25"
            >
              {pendingCreate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar servico
                </>
              )}
            </Button>
          </form>
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-800/65 bg-zinc-950/45 p-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] sm:mt-6 sm:p-5">
        <div className="space-y-3">
          {services.map((service) => {
            const cardIsPending =
              pendingAction?.type !== "create" &&
              pendingAction?.serviceId === service.id
            const isUpdating =
              pendingAction?.type === "update" && pendingAction.serviceId === service.id
            const isDeleting =
              pendingAction?.type === "delete" && pendingAction.serviceId === service.id

            return (
              <form
                key={service.id}
                onSubmit={(event) => void handleUpdateService(event, service)}
                className={cn(
                  "rounded-2xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950/75 p-4 shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_16px_30px_rgba(0,0,0,0.28)]",
                  !service.isActive && "border-zinc-700/70 opacity-75",
                  cardIsPending && "opacity-80",
                )}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                      service.isActive
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-700 bg-zinc-900/70 text-zinc-400",
                    )}
                  >
                    {service.isActive ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {service.durationMinutes} min
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    name="name"
                    value={service.name}
                    required
                    disabled={cardIsPending}
                    onChange={(event) => updateServiceField(service.id, "name", event.target.value)}
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                  <Input
                    name="price"
                    value={service.price}
                    required
                    disabled={cardIsPending}
                    onChange={(event) => updateServiceField(service.id, "price", event.target.value)}
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
                  />
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Duracao
                    </span>
                    <select
                      name="durationMinutes"
                      value={service.durationMinutes}
                      disabled={cardIsPending}
                      onChange={(event) =>
                        updateServiceField(service.id, "durationMinutes", event.target.value)
                      }
                      className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
                    >
                      {durationOptions.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Buffer antes
                    </span>
                    <select
                      name="bufferBeforeMinutes"
                      value={service.bufferBeforeMinutes}
                      disabled={cardIsPending}
                      onChange={(event) =>
                        updateServiceField(service.id, "bufferBeforeMinutes", event.target.value)
                      }
                      className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
                    >
                      {bufferOptions.map((buffer) => (
                        <option key={buffer} value={buffer}>
                          {buffer} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                      Buffer depois
                    </span>
                    <select
                      name="bufferAfterMinutes"
                      value={service.bufferAfterMinutes}
                      disabled={cardIsPending}
                      onChange={(event) =>
                        updateServiceField(service.id, "bufferAfterMinutes", event.target.value)
                      }
                      className="h-10 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"
                    >
                      {bufferOptions.map((buffer) => (
                        <option key={buffer} value={buffer}>
                          {buffer} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    name="description"
                    value={service.description}
                    disabled={cardIsPending}
                    onChange={(event) =>
                      updateServiceField(service.id, "description", event.target.value)
                    }
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
                  />
                  <Input
                    name="imageUrl"
                    value={service.imageUrl}
                    placeholder="Imagem: corte.png ou /services/corte.png"
                    disabled={cardIsPending}
                    onChange={(event) => updateServiceField(service.id, "imageUrl", event.target.value)}
                    className="border-zinc-700/80 bg-zinc-900/85 text-zinc-100 md:col-span-2"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={cardIsPending}
                    className="rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    disabled={cardIsPending || !service.isActive}
                    onClick={() => void handleDeleteService(service)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/12 px-4 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Desativando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {service.isActive ? "Desativar" : "Inativo"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          })}

          {services.length === 0 && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-4 text-sm text-zinc-400">
              Nenhum servico cadastrado.
            </p>
          )}
        </div>
      </section>
    </>
  )
}

export default ServicesManagerClient
