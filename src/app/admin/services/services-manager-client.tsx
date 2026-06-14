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
}
const durationOptions = ["10", "15", "20", "30", "45", "60", "75", "90", "120"]
const fieldLabelClassName =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
const inputClassName = "h-11 border-zinc-700/80 bg-zinc-900/85 text-zinc-100"
const selectClassName =
  "h-11 w-full rounded-md border border-zinc-700/80 bg-zinc-900/85 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-brand/50"

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
  formData.set("bufferBeforeMinutes", "0")
  formData.set("bufferAfterMinutes", "0")

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
          <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" onSubmit={handleCreateService}>
            <Input
              name="name"
              placeholder="Nome"
              required
              value={newService.name}
              disabled={pendingCreate}
              onChange={(event) => setNewService((service) => ({ ...service, name: event.target.value }))}
              className={cn("col-span-2 sm:col-span-4", inputClassName)}
            />
            <label className="space-y-1.5 sm:col-span-2">
              <span className={fieldLabelClassName}>Preco</span>
              <Input
                name="price"
                placeholder="59.90"
                required
                value={newService.price}
                disabled={pendingCreate}
                onChange={(event) => setNewService((service) => ({ ...service, price: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className={fieldLabelClassName}>Duracao</span>
              <select
                name="durationMinutes"
                value={newService.durationMinutes}
                disabled={pendingCreate}
                onChange={(event) =>
                  setNewService((service) => ({ ...service, durationMinutes: event.target.value }))
                }
                className={selectClassName}
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} min
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className={fieldLabelClassName}>Descricao</span>
              <Input
                name="description"
                placeholder="Descricao opcional"
                value={newService.description}
                disabled={pendingCreate}
                onChange={(event) =>
                  setNewService((service) => ({ ...service, description: event.target.value }))
                }
                className={inputClassName}
              />
            </label>
            <label className="col-span-2 space-y-1.5 sm:col-span-4">
              <span className={fieldLabelClassName}>Imagem</span>
              <Input
                name="imageUrl"
                placeholder="corte.png ou /services/corte.png"
                value={newService.imageUrl}
                disabled={pendingCreate}
                onChange={(event) => setNewService((service) => ({ ...service, imageUrl: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <p className="col-span-2 text-xs leading-relaxed text-zinc-500 sm:col-span-4">
              Dica: coloque a imagem em `public/services` e informe apenas o nome do arquivo.
            </p>
            <Button
              type="submit"
              disabled={pendingCreate}
              className="col-span-2 h-11 w-full rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25 sm:col-span-4 sm:w-fit"
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

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Input
                    name="name"
                    placeholder="Nome"
                    value={service.name}
                    required
                    disabled={cardIsPending}
                    onChange={(event) => updateServiceField(service.id, "name", event.target.value)}
                    className={cn("col-span-2 sm:col-span-4", inputClassName)}
                  />
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className={fieldLabelClassName}>Preco</span>
                    <Input
                      name="price"
                      value={service.price}
                      required
                      disabled={cardIsPending}
                      onChange={(event) => updateServiceField(service.id, "price", event.target.value)}
                      className={inputClassName}
                    />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className={fieldLabelClassName}>Duracao</span>
                    <select
                      name="durationMinutes"
                      value={service.durationMinutes}
                      disabled={cardIsPending}
                      onChange={(event) =>
                        updateServiceField(service.id, "durationMinutes", event.target.value)
                      }
                      className={selectClassName}
                    >
                      {durationOptions.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} min
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 space-y-1.5 sm:col-span-4">
                    <span className={fieldLabelClassName}>Descricao</span>
                    <Input
                      name="description"
                      value={service.description}
                      placeholder="Descricao opcional"
                      disabled={cardIsPending}
                      onChange={(event) =>
                        updateServiceField(service.id, "description", event.target.value)
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="col-span-2 space-y-1.5 sm:col-span-4">
                    <span className={fieldLabelClassName}>Imagem</span>
                    <Input
                      name="imageUrl"
                      value={service.imageUrl}
                      placeholder="corte.png ou /services/corte.png"
                      disabled={cardIsPending}
                      onChange={(event) => updateServiceField(service.id, "imageUrl", event.target.value)}
                      className={inputClassName}
                    />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="submit"
                    disabled={cardIsPending}
                    className="h-11 w-full rounded-xl border border-brand/35 bg-brand/15 text-brand-100 hover:bg-brand/25 sm:w-auto"
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
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-500/35 bg-red-500/12 px-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:px-4"
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
