"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const STORAGE_KEY = "silklabs_offer_builder"

type Step = {
  id: string
  title: string
  subtitle: string
  field: string
  placeholder: string
  help: string
  multiline?: boolean
}

const STEPS: Step[] = [
  {
    id: "product",
    title: "What's your offer?",
    subtitle: "Start with your product or service idea.",
    field: "product",
    placeholder: "e.g., A fitness coaching program for busy professionals",
    help: "Describe what you're selling in one sentence.",
  },
  {
    id: "dream-outcome",
    title: "Dream Outcome",
    subtitle: "What's the single best result your customer gets?",
    field: "dreamOutcome",
    placeholder: "e.g., Lose 20 lbs in 12 weeks and keep it off forever",
    help: "The more specific the outcome, the more valuable the offer. Quantify it.",
  },
  {
    id: "problem-agitation",
    title: "Problem Agitation",
    subtitle: "What pain does your customer feel that makes them NEED this?",
    field: "problemAgitation",
    placeholder: "e.g., They're frustrated by diets that don't work, embarrassed by their body, and tired of wasting money on quick fixes",
    help: "Agitate the problem's size, scope, and what's at stake if they don't fix it.",
    multiline: true,
  },
  {
    id: "likelihood",
    title: "Perceived Likelihood of Success",
    subtitle: "How do you increase their belief they'll actually get the result?",
    field: "likelihood",
    placeholder: "e.g., I've helped 500+ clients achieve this exact result. Here are their before/after photos.",
    help: "Testimonials, case studies, credentials, demonstrations. Increase believability.",
    multiline: true,
  },
  {
    id: "time-delay",
    title: "Time Delay",
    subtitle: "How do you deliver the result faster than they expect?",
    field: "timeDelay",
    placeholder: "e.g., Most programs take 6 months. Ours delivers results in 6 weeks.",
    help: "Speed is a value multiplier. The faster the result, the more the offer is worth.",
  },
  {
    id: "effort",
    title: "Effort & Sacrifice",
    subtitle: "How do you make it easier for them to get the result?",
    field: "effort",
    placeholder: "e.g., We handle the meal prep, the workout planning, and check in daily so you just show up.",
    help: "Reduce friction. The less they have to do, the more valuable your offer.",
    multiline: true,
  },
  {
    id: "bonuses",
    title: "Bonuses",
    subtitle: "Stack bonuses to overwhelm with value. List every bonus.",
    field: "bonuses",
    placeholder: "e.g., Bonus 1: 24/7 chat support ($497 value)\nBonus 2: Monthly progress reports ($197 value)\nBonus 3: VIP community access ($297 value)",
    help: "Each bonus should solve a specific objection or accelerate the result. Total bonus value should far exceed your price.",
    multiline: true,
  },
  {
    id: "scarcity",
    title: "Scarcity",
    subtitle: "What makes this offer limited? Why can't they get it anytime?",
    field: "scarcity",
    placeholder: "e.g., Only 10 spots available this month. I personally coach each client.",
    help: "Limited quantity, limited access, limited availability. Real scarcity, not fake.",
  },
  {
    id: "urgency",
    title: "Urgency",
    subtitle: "Why do they need to act now instead of later?",
    field: "urgency",
    placeholder: "e.g., Price increases by $200 at the end of the week. Doors close Friday at midnight.",
    help: "Time-based deadline. Price increase, bonus removal, enrollment closing.",
  },
  {
    id: "risk-reversal",
    title: "Risk Reversal / Guarantee",
    subtitle: "Remove all risk from the customer. What's your guarantee?",
    field: "riskReversal",
    placeholder: "e.g., 100% money back if you don't lose 10 lbs in 30 days. No questions asked.",
    help: "The stronger the guarantee, the more people will buy. Put the risk on you.",
    multiline: true,
  },
  {
    id: "pricing",
    title: "Grand Slam Pricing",
    subtitle: "Price based on value delivered, not cost. What's your price?",
    field: "pricing",
    placeholder: "e.g., $1,997",
    help: "The Grand Slam Offer pricing formula: Total bonus value + Your core value = Total value. Your price should be a fraction of the total value.",
  },
  {
    id: "naming",
    title: "Name Your Offer",
    subtitle: "Give it a name that captures the dream outcome.",
    field: "naming",
    placeholder: "e.g., The 12-Week Body Transformation Accelerator",
    help: "The best offer names contain: the time frame + the result. Make it memorable.",
  },
]

export default function OfferBuilderClient() {
  const [step, setStep] = useState(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const p = JSON.parse(saved); return p.step ?? 0 } } catch { /* ignore */ }
    return 0
  })
  const [data, setData] = useState<Record<string, string>>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const p = JSON.parse(saved); return p.data ?? {} } } catch { /* ignore */ }
    return {}
  })
  const [preview, setPreview] = useState(false)

  const update = useCallback((field: string, value: string) => {
    setData((d) => ({ ...d, [field]: value }))
  }, [])

  // Auto-save to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data })) } catch { /* quota exceeded */ }
  }, [step, data])

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  const goNext = () => {
    if (isLast) { setPreview(true); return }
    setStep((s: number) => s + 1)
  }

  const goBack = () => setStep((s: number) => s - 1)

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setData({}); setStep(0); setPreview(false)
  }

  if (preview) {
    return <OfferPreview data={data} onBack={() => setPreview(false)} onReset={handleReset} />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-6" key={s.id}>
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.06em] text-primary">{s.id.replace(/-/g, " ")}</p>
          <h2 className="font-heading text-2xl font-bold text-foreground">{s.title}</h2>
          <p className="text-sm text-muted-foreground">{s.subtitle}</p>
        </div>

        {s.multiline ? (
          <textarea
            placeholder={s.placeholder}
            value={data[s.field] || ""}
            onChange={(e) => update(s.field, e.target.value)}
            className="w-full min-h-[140px] px-3 py-2.5 bg-muted border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground outline-none focus:border-ring resize-y"
            rows={5}
          />
        ) : (
          <Input
            placeholder={s.placeholder}
            value={data[s.field] || ""}
            onChange={(e) => update(s.field, e.target.value)}
            className="text-sm"
          />
        )}

        <p className="text-xs text-muted-foreground italic">{s.help}</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-border-metal">
        {!isFirst && <Button variant="outline" onClick={goBack} className="flex-1">Back</Button>}
        <Button onClick={goNext} className="flex-1" disabled={!data[s.field]?.trim()}>
          {isLast ? "Review Your Grand Slam Offer" : "Next"}
        </Button>
      </div>
    </div>
  )
}

function OfferPreview({ data, onBack, onReset }: { data: Record<string, string>; onBack: () => void; onReset: () => void }) {
  // Parse dollar values from bonus text: looks for $X, X dollars, $X value patterns
  const totalBonusValue = (() => {
    const text = data.bonuses || ""
    const amounts: number[] = []
    // Match patterns like "$497", "$497 value", "($497 value)", "$1,997"
    const re = /\$([0-9,]+)/g
    let m
    while ((m = re.exec(text)) !== null) {
      const val = parseInt(m[1].replace(/,/g, ""), 10)
      if (!isNaN(val) && val < 1_000_000) amounts.push(val)
    }
    return amounts.reduce((sum, v) => sum + v, 0)
  })()
  const coreValue = data.dreamOutcome || "your result"
  const price = data.pricing || "$X"

  const section = (title: string, content: string, accent = false) => content ? (
    <div className={`p-4 rounded-lg border ${accent ? "bg-primary/5 border-primary/20" : "bg-muted border-border-metal"}`}>
      <h4 className="text-xs font-mono uppercase tracking-[0.06em] text-muted-foreground mb-1">{title}</h4>
      <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
    </div>
  ) : null

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="text-center space-y-2">
        <p className="text-xs font-mono uppercase tracking-[0.06em] text-primary">Your Grand Slam Offer</p>
        <h2 className="font-heading text-3xl font-bold text-foreground">{data.naming || data.product || "Your Offer"}</h2>
      </div>

      <div className="space-y-3">
        {section("The Offer", data.product, true)}
        {section("Dream Outcome", data.dreamOutcome, true)}
        {section("Problem We Solve", data.problemAgitation)}
        {section("Why It Works (Likelihood)", data.likelihood)}
        {section("Speed of Results (Time Delay)", data.timeDelay)}
        {section("Effort Required", data.effort)}
        {section("Bonuses", data.bonuses)}
        {section("Scarcity", data.scarcity)}
        {section("Urgency", data.urgency)}
        {section("Risk Reversal / Guarantee", data.riskReversal, true)}
      </div>

      {/* Value summary */}
      <div className="p-6 rounded-xl bg-muted border border-border-metal text-center space-y-3">
        <p className="text-xs font-mono uppercase tracking-[0.06em] text-muted-foreground">Grand Slam Pricing</p>
        <p className="text-4xl font-heading font-bold text-primary">{price}</p>
        <p className="text-sm text-muted-foreground">
          {data.dreamOutcome ? `For ${data.dreamOutcome.toLowerCase()}` : ""}
        </p>
      </div>

      {/* Star Sequence Script */}
      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
        <p className="text-xs font-mono uppercase tracking-[0.06em] text-primary">Offer Script (Star Sequence)</p>
        <div className="text-sm text-foreground space-y-3 whitespace-pre-wrap">
          <p><strong>1. The Hook:</strong> {data.problemAgitation?.split(". ")[0] || "Struggling with [problem]?"}</p>
          <p><strong>2. The Problem:</strong> {data.problemAgitation || "You've tried before and it didn't work because..."}</p>
          <p><strong>3. The Solution:</strong> {data.product || "We created [product] to help you..."}</p>
          <p><strong>4. The Dream Outcome:</strong> {data.dreamOutcome || "Imagine what it would feel like to finally [result]..."}</p>
          <p><strong>5. The Fix:</strong> {data.timeDelay || data.effort || "With [our method], you'll get there faster and easier than ever before."}</p>
          <p><strong>6. Social Proof:</strong> {data.likelihood || "We've already helped [X] people achieve this exact result."}</p>
          <p><strong>7. The Offer:</strong> {data.naming || data.product} — {price}</p>
          <p><strong>8. Bonuses:</strong> {data.bonuses || "Plus these exclusive bonuses..."}</p>
          <p><strong>9. Risk Reversal:</strong> {data.riskReversal || "Try it risk-free with our guarantee."}</p>
          <p><strong>10. Scarcity & Urgency:</strong> {data.scarcity} {data.urgency}</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border-metal">
        <Button variant="outline" onClick={onBack} className="flex-1">Edit Answers</Button>
        <Button onClick={onReset} className="flex-1">Start Over</Button>
      </div>
    </div>
  )
}
