import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Terms of Service — SILKLABS",
  description:
    "SilkLabs Terms of Service: no user auditing or verification, user-posted content, do-your-own-research responsibility, and limitation of liability.",
}

const LAST_UPDATED = "August 24, 2026"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold tracking-tight text-primary">{title}</h2>
      <div className="space-y-3 font-mono text-[12px] leading-relaxed tracking-[0.03em] text-outline">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border-metal bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/silklearn.avif" alt="SILKLABS" width={32} height={32} className="shrink-0" />
            <span className="font-heading text-lg font-bold tracking-tight text-primary">SILKLABS</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline hover:text-primary">
              Home
            </Link>
            <Link href="/register" className="font-mono text-[11px] uppercase tracking-[0.06em] text-primary hover:text-primary-container">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-1 mx-auto w-full max-w-4xl flex-1 px-6 pb-20 pt-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Legal</p>
        <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
          Last updated: {LAST_UPDATED}
        </p>

        {/* The four pillars — the same statements shown in the signup confirmation dialog */}
        <div className="mt-8 border border-primary-container/30 bg-surface/60 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary-container">
            Read this first
          </p>
          <ul className="mt-3 list-outside list-disc space-y-2 pl-5 font-mono text-[12px] leading-relaxed text-outline [&_strong]:text-primary">
            <li>
              <strong>We do not audit, vet, or verify users</strong> or anything they post. Profiles,
              projects, claims of skill, and proof-of-work entries are user-submitted and published as-is.
            </li>
            <li>
              <strong>You are solely responsible for your own research.</strong> Before you contact,
              work with, share information with, or send money to anyone here, verify who they are and
              what they have done.
            </li>
            <li>
              <strong>To the maximum extent permitted by law, SilkLabs accepts no liability</strong> for
              fraud, misrepresentation, damages, losses, or harm of any kind arising from your use of
              the platform or your dealings with other users.
            </li>
            <li>
              <strong>SilkLabs is not a party to any agreement between users.</strong> We are a venue,
              not an employer, agent, escrow service, or guarantor.
            </li>
          </ul>
        </div>

        <div className="mt-12 space-y-10">
          <Section title="1. Acceptance of Terms">
            <p>
              By creating an account or using SilkLabs (&ldquo;the Platform&rdquo;), you agree to these
              Terms of Service (&ldquo;Terms&rdquo;) in full. If you do not agree, do not use the
              Platform. These Terms apply every time you access the Platform; the version in force at
              the time of each use governs that use.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 18 years old (or the age of legal majority in your jurisdiction) to
              use the Platform. By using it, you represent that you meet this requirement and that you
              are legally able to enter into these Terms.
            </p>
          </Section>

          <Section title="3. What SilkLabs Is — and Is Not">
            <p>
              SilkLabs is a venue where individuals post projects, offer and request collaboration, and
              publish content about themselves and their work. SilkLabs provides tooling intended to
              help users evaluate one another (such as self-reported and ingested &ldquo;proof of
              work&rdquo; records). That tooling is informational only.
            </p>
            <p>
              SilkLabs is <strong>not</strong>: an employment agency, recruiter, background-check
              service, escrow or payment service, guarantor, insurer, or party to any relationship or
              agreement formed between users. We do not supervise, employ, or represent any user.
            </p>
          </Section>

          <Section title="4. No Auditing, Vetting, or Verification of Users">
            <p>
              You acknowledge and agree that SilkLabs does <strong>not</strong> audit, screen,
              investigate, vet, verify, endorse, or certify any user, account, project posting, claim,
              credential, portfolio item, proof-of-work entry, communication, or any other content on
              the Platform — even where a feature might suggest otherwise.
            </p>
            <p>
              Any name, photograph, biography, role, history, rating, index score, vector embedding, or
              other data presented on the Platform originates from users or automated processing of
              user-supplied material. None of it constitutes a representation or warranty by SilkLabs
              about any person, project, or opportunity.
            </p>
          </Section>

          <Section title="5. User Content and No Duty to Monitor">
            <p>
              Users may post what they choose within these Terms. We do not pre-screen content and we
              assume no duty to actively monitor the Platform for unlawful or objectionable material.
              All content is the sole responsibility of the person who posted it.
            </p>
            <p>
              You retain ownership of what you post and grant SilkLabs a worldwide, royalty-free,
              non-exclusive license to host, reproduce, display, and process it solely as needed to
              operate and improve the Platform.
            </p>
            <p>
              We reserve the right — but assume no obligation — to remove any content or suspend any
              account at any time for violation of these Terms, suspected fraud or illegal activity,
              legal compliance, or protection of the Platform, with or without notice.
            </p>
          </Section>

          <Section title="6. Your Responsibility: Do Your Own Research">
            <p>
              You alone are responsible for every decision you make based on Platform content and for
              every interaction you have with other users. Before engaging with any user, project, or
              opportunity, you must conduct your own due diligence appropriate to the risk — including,
              where relevant, verifying identity, references, portfolios, code authorship, business
              registrations, and financial arrangements independently of SilkLabs.
            </p>
            <p>
              Exercise particular caution before: sending money, crypto, or valuables to another user;
              sharing identity documents, financial details, or credentials; working without a written
              agreement; or meeting anyone offline.
            </p>
          </Section>

          <Section title="7. Assumption of Risk; No Liability for Fraud or Other Harm">
            <p>
              You knowingly and voluntarily assume all risks arising from your use of the Platform and
              your dealings with other users, whether online or offline — including without limitation
              the risk of fraud, scam, misrepresentation, impersonation, defamation, harassment,
              negligence, breach of contract, intellectual-property infringement, physical harm,
              property damage, and economic loss.
            </p>
            <p>
              To the maximum extent permitted by applicable law, SilkLabs, its owners, officers,
              employees, and suppliers shall not be liable to you for any claim, damage, loss, or
              expense of any kind — direct, indirect, incidental, special, consequential, exemplary, or
              punitive — arising out of or relating to the Platform, its content, other users, or any
              dealings between users, including any such dealings involving fraud, even if advised of
              the possibility of such loss.
            </p>
            <p>
              Where liability cannot be excluded under mandatory law, it is limited, at SilkLabs&apos;
              option, to resupplying the affected service or the greatest amount permitted by that law,
              and in no event exceeds EUR 50 (fifty euros) or the equivalent.
            </p>
          </Section>

          <Section title="8. Services Provided As-Is">
            <p>
              The Platform and everything on it are provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, express or implied — including
              merchantability, fitness for a particular purpose, accuracy, non-infringement, and
              uninterrupted or error-free operation. We disclaim all such warranties to the maximum
              extent permitted by law.
            </p>
          </Section>

          <Section title="9. Indemnification">
            <p>
              You agree to indemnify and hold harmless SilkLabs and its owners, officers, employees,
              and suppliers from any claim, demand, loss, liability, or expense (including reasonable
              legal fees) brought by third parties arising from: (a) your content; (b) your use of the
              Platform; (c) your interactions or dealings with other users; (d) your breach of these
              Terms; or (e) your violation of any law or third-party right.
            </p>
          </Section>

          <Section title="10. Prohibited Conduct">
            <p>
              Even though we do not monitor content, the following are strictly prohibited and will
              result in immediate suspension where detected: fraud, scams, phishing, impersonation,
              false claims of authorship or identity; malware; harassment or threats; illegal goods or
              services; sexual content involving minors (reported to authorities); scraping or
              automated abuse; and circumventing security or rate limits.
            </p>
            <p>
              Reporting: if you encounter fraud or illegal activity on the Platform, report it to us at
              the contact below. We act on credible reports as required by applicable law; acting on
              reports is our policy choice, not an admission of any duty to monitor.
            </p>
          </Section>

          <Section title="11. Suspension and Termination">
            <p>
              You may stop using the Platform at any time. We may suspend or terminate your account at
              any time, with or without cause or notice. Upon termination, the licenses you granted
              survive as needed to remove or retain data per our operations, and sections intended to
              survive (including 4–9) continue in force.
            </p>
          </Section>

          <Section title="12. Governing Law and Disputes">
            <p>
              These Terms are governed by the laws of [GOVERNING JURISDICTION], without regard to
              conflict-of-law rules, and you submit to the exclusive jurisdiction of the courts located
              there, except where applicable law grants you the right to bring proceedings locally.
              Nothing in this section deprives consumers of protections that cannot be waived under
              mandatory local law.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may update these Terms at any time by posting a new version with an updated date.
              Continued use after posting constitutes acceptance. Material changes affecting existing
              accounts will be communicated through the Platform where reasonably possible.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Questions, reports, and legal notices: jesser@silkdev.com.tn
            </p>
          </Section>
        </div>

        <div className="mt-16 border-t border-border-metal pt-8 text-center">
          <Link href="/register">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-primary underline underline-offset-4">
              Back to sign up
            </span>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border-metal py-8">
        <div className="mx-auto max-w-4xl px-6 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
          SILKLABS &mdash; Matched on proof. Built to ship. &nbsp;&middot;&nbsp;{" "}
          <Link href="/terms" className="hover:text-primary">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  )
}
