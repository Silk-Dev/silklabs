import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { nextCookies } from "better-auth/next-js"

const baseURL = process.env.BETTER_AUTH_URL ?? "https://labs.silkdev.com.tn"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL,
  trustedOrigins: [baseURL],
  plugins: [nextCookies()],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "User",
        input: false,
      },
    },
  },
})

export async function getSession() {
  const reqHeaders = await headers()
  return auth.api.getSession({ headers: reqHeaders })
}
