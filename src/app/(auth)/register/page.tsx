"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { signUpSchema } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)
    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      password: form.get("password") as string,
    }
    const parsed = signUpSchema.safeParse(data)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const errs: Record<string, string> = {}
      if (fieldErrors.name) errs.name = fieldErrors.name[0]
      if (fieldErrors.email) errs.email = fieldErrors.email[0]
      if (fieldErrors.password) errs.password = fieldErrors.password[0]
      setErrors(errs)
      return
    }
    try {
      const { error: authError } = await authClient.signUp.email(data)
      if (authError) {
        setGeneralError(typeof authError === "string" ? authError : authError.message ?? "Registration failed")
      } else {
        router.push("/discover")
      }
    } catch {
      setGeneralError("Registration failed")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center justify-center gap-2">
            <Image src="/silklearn.avif" alt="SILKLABS" width={32} height={32} />
            <span className="font-heading text-2xl font-bold text-primary">
              SILKLABS
            </span>
          </Link>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            Create Account
          </p>
        </div>
        <div>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {generalError && (
              <p className="text-sm text-destructive">{generalError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
