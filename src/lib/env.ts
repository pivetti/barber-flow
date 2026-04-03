import "server-only"
import { z } from "zod"

const appEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
})

let cachedEnv: z.infer<typeof appEnvSchema> | null = null

export const getAppEnv = () => {
  if (cachedEnv) {
    return cachedEnv
  }

  const parsed = appEnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${message}`)
  }

  cachedEnv = parsed.data
  return cachedEnv
}
