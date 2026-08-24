"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { recordTermsAcceptance } from "@/services/auth.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OAuthButtons } from "@/components/oauth-buttons"

interface PendingSignup {
  name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState<PendingSignup | null>(null)

  // Step 1: validate the form and open the Terms confirmation dialog.
  // NO account is created here.
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const name = (form.get("name") as string).trim()
    const email = (form.get("email") as string).trim()
    const password = form.get("password") as string

    if (!termsAgreed) {
      setError("You must accept the Terms of Service to create an account.")
      return
    }

    setPending({ name, email, password })
    setConfirmOpen(true)
  }

  // Step 2: user agreed in the dialog — now actually create the account.
  async function handleConfirmedSignup() {
    if (!pending) return
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await authClient.signUp.email({
        name: pending.name,
        email: pending.email,
        password: pending.password,
      })
      if (authError) {
        setError(typeof authError === "string" ? authError : authError.message ?? "Registration failed")
        setConfirmOpen(false)
      } else {
        const acceptance = await recordTermsAcceptance()
        if (!acceptance.success) {
          console.error("Failed to persist Terms acceptance")
        }
        router.push("/onboarding")
      }
    } catch {
      setError("Registration failed")
      setConfirmOpen(false)
    } finally {
      setLoading(false)
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
            Post your vision. Meet builders who can ship it.
          </p>
        </div>
        <div>
          {/* OAuth buttons — locked until the Terms checkbox is checked */}
          <OAuthButtons termsAgreed={termsAgreed} />

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border-metal" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-muted-foreground">or sign up with email</span></div>
          </div>

          {error && (
            <p className="mb-3 text-sm text-destructive" role="alert">{error}</p>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" type="text" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={termsAgreed}
                onCheckedChange={(v) => setTermsAgreed(v === true)}
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                I have read and accept the{" "}
                <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2 hover:text-primary-container">
                  Terms of Service
                </Link>
                , including that SilkLabs does not audit or verify users and that I am responsible for my own research.
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Create Account
            </Button>
          </form>

          {/* Signup is gated behind this dialog: no account exists until agreement. */}
          <Dialog open={confirmOpen} onOpenChange={(o) => !loading && setConfirmOpen(o)}>
            <DialogContent className="border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-primary">Before you join SilkLabs</DialogTitle>
                <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
                  Please read carefully — this is the deal
                </DialogDescription>
              </DialogHeader>
              <ul className="list-outside list-disc space-y-2 pl-5 font-mono text-[12px] leading-relaxed tracking-[0.02em] text-outline [&_strong]:text-primary">
                <li><strong>We do not audit or verify anyone.</strong> Users post what they want; profiles and claims are published unvetted.</li>
                <li><strong>Do your own research.</strong> Verify identity, references, and work before engaging with anyone here.</li>
                <li><strong>SilkLabs holds no liability</strong> for fraud or any other harm arising from your use of the platform or dealings with other users, to the maximum extent permitted by law.</li>
                <li><strong>SilkLabs is not a party</strong> to any agreement between users.</li>
              </ul>
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                By agreeing you accept the full{" "}
                <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2">
                  Terms of Service
                </Link>
                . Your acceptance timestamp is recorded.
              </p>
              <DialogFooter>
                <Button variant="outline" disabled={loading} onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={loading} onClick={handleConfirmedSignup}>
                  {loading ? "Creating account…" : "I Understand & Agree"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
            <Link href="/terms" target="_blank" className="hover:text-primary">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
