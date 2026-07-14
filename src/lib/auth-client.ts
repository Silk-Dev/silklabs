const BASE = "/api/auth"

export const authClient = {
  signIn: {
    email: async (data: { email: string; password: string }) => {
      const res = await fetch(`${BASE}/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || json.error) return { error: json.error ?? { message: "Invalid email or password" }, data: null }
      return { data: json, error: null }
    },
    social: async (provider: "google" | "github" | "linkedin") => {
      window.location.href = `${BASE}/sign-in/social/${provider}`
      return { error: null, data: null }
    },
  },
  signUp: {
    email: async (data: { name: string; email: string; password: string }) => {
      const res = await fetch(`${BASE}/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok || json.error) return { error: json.error ?? { message: "Registration failed" }, data: null }
      return { data: json, error: null }
    },
    social: async (provider: "google" | "github" | "linkedin") => {
      window.location.href = `${BASE}/sign-up/social/${provider}`
      return { error: null, data: null }
    },
  },
  signOut: async () => {
    await fetch(`${BASE}/sign-out`, { method: "POST" })
  },
}
