"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { recordTermsAcceptance } from "@/services/auth.service"
import { Button } from "@/components/ui/button"

/**
 * Fail-closed Terms gate rendered by the onboarding layout when the session
 * user has no recorded ToS acceptance. Onboarding content is NOT passed through
 * until the server re-renders with termsAcceptedAt set.
 */
export function TermsGate({ name }: { name: string | null }) {
  const router = useRouter()
  const [agreeing, setAgreeing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAgree() {
    setAgreeing(true)
    setError(null)
    try {
      const result = await recordTermsAcceptance()
      if (!result.success) {
        setError("Could not record your acceptance. Please try again.")
        return
      }
      // Re-render the server layout — it now sees termsAcceptedAt and lets content through.
      router.refresh()
    } catch {
      setError("Could not record your acceptance. Please try again.")
    } finally {
      setAgreeing(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary-container">
          One thing before you continue
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-primary">
          Welcome{name ? `, ${name.split(" ")[0]}` : ""}. This is the deal.
        </h1>

        <ul className="mt-5 list-outside list-disc space-y-2 pl-5 font-mono text-[12px] leading-relaxed tracking-[0.02em] text-outline [&_strong]:text-primary">
          <li><strong>We do not audit or verify anyone.</strong> Users post what they want; profiles and claims are published unvetted.</li>
          <li><strong>Do your own research.</strong> Verify identity, references, and work before engaging with anyone here.</li>
          <li><strong>SilkLabs holds no liability</strong> for fraud or any other harm arising from your use of the platform or dealings with other users, to the maximum extent permitted by law.</li>
          <li><strong>SilkLabs is not a party</strong> to any agreement between users.</li>
        </ul>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
          By agreeing you accept the full{" "}
          <Link href="/terms" target="_blank" className="text-primary underline underline-offset-2">
            Terms of Service
          </Link>
          . Your acceptance timestamp is recorded.
        </p>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Link href="/" className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground hover:text-primary">
            Back to home
          </Link>
          <Button onClick={handleAgree} disabled={agreeing}>
            {agreeing ? "Recording…" : "I Understand & Agree"}
          </Button>
        </div>
      </div>
    </div>
  )
}
