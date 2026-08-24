"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OAuthButtons } from "@/components/oauth-buttons"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      const { error: authError } = await authClient.signIn.email({
        email: form.get("email") as string,
        password: form.get("password") as string,
      })
      if (authError) {
        setError(typeof authError === "string" ? authError : authError.message ?? "Invalid email or password")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Invalid email or password")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Image src="/silklearn.avif" alt="SILKLABS" width={44} height={44} />
            <span className="font-heading text-2xl font-bold text-primary">
              SILKLABS
            </span>
          </Link>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            Welcome back
          </p>
        </div>
        <div>
          {/* OAuth buttons */}
          <OAuthButtons />

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border-metal" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-muted-foreground">or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
