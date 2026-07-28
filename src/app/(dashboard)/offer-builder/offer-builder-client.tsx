"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

// ─── Chat message type ───
interface Message {
  role: "bot" | "user"
  text: string
}

// ─── Grand Slam Offer flow ───
interface OfferStep {
  id: string
  question: string
  coaching: (answer: string) => string
  followUp?: string
}

const STEPS: OfferStep[] = [
  {
    id: "product",
    question: "What's your product or service? Describe what you're selling in one sentence.",
    coaching: (a: string) =>
      a.length > 20
        ? "Good — clear and concise. A well-defined offer is the foundation."
        : "Try to be more specific. The clearer the offer, the easier the sale.",
  },
  {
    id: "dream-outcome",
    question: "What's the single best result your customer gets? Be specific and quantify it if possible.",
    coaching: (a: string) => {
      const hasNumber = /\d+/.test(a)
      const hasTime = /(week|month|day|year)/i.test(a)
      if (hasNumber && hasTime) return "Excellent! A quantified, time-bound outcome is the highest leverage element of the Value Equation."
      if (hasNumber) return "Good — quantified outcomes increase perceived value. Try adding a time frame."
      return "Quantify and time-bound this. \"Lose 20 lbs in 12 weeks\" is worth 10x more than \"get in shape.\""
    },
  },
  {
    id: "problem-agitation",
    question: "What pain or frustration does your customer feel that makes them NEED this? Agitate it — what's at stake if they don't fix it?",
    coaching: (a: string) =>
      a.length > 60
        ? "Strong emotional agitation. The bigger the pain, the more valuable the solution."
        : "Go deeper. What keeps them up at night? What have they already tried and failed at?",
  },
  {
    id: "likelihood",
    question: "How do you prove this works? Describe social proof, testimonials, case studies, credentials, or demonstrations.",
    coaching: (a: string) => {
      const hasNumbers = /\d+/.test(a)
      const hasProof = /(client|customer|case|testimonial|student|patient)/i.test(a)
      if (hasNumbers && hasProof) return "Strong social proof. Numbers + specific results = high believability."
      if (hasProof) return "Good — name the specific results. How many people? What was their outcome?"
      return "Add numbers. \"I've helped 500+ clients achieve X\" is infinitely more believable than \"I help people.\""
    },
  },
  {
    id: "time-delay",
    question: "How fast do they get results? Speed is a value multiplier — the faster the result, the more the offer is worth. How do you deliver faster than they expect?",
    coaching: (a: string) =>
      /(day|week|month|hour)/i.test(a)
        ? "Time-bound and fast. Speed is one of the highest value levers in the Value Equation."
        : "Name the timeframe. \"In 6 weeks\" vs \"eventually\" — the first one sells.",
  },
  {
    id: "effort",
    question: "How do you make it easy for them? What friction do you remove? The less they have to do, the more valuable your offer.",
    coaching: (a: string) =>
      a.length > 30
        ? "Reducing effort = increasing value. Great — you're making it easy for them."
        : "Be more specific. What do you handle for them? What do they NOT have to do?",
  },
  {
    id: "bonuses",
    question: "Now let's stack bonuses. List every bonus you can include — each should solve an objection or accelerate the result. Give each a perceived value.",
    coaching: (a: string) => {
      const hasDollar = /\$/.test(a)
      const count = a.split("\n").filter((l) => l.trim().length > 10).length
      if (count >= 3 && hasDollar) return "Excellent bonus stack! 3+ bonuses with values creates massive perceived value."
      if (count >= 3) return "Good stack. Assign a dollar value to each bonus — the perceived value should far exceed your price."
      return "Stack more. 5–7 bonuses is ideal. Each one should feel worth more than the price alone."
    },
  },
  {
    id: "risk-reversal",
    question: "What's your guarantee? Remove ALL risk from the customer. The stronger the guarantee, the more people will buy. Put the risk on you.",
    coaching: (a: string) => {
      const strongGuarantee = /(money.back|100%|double|triple|risk.free|no.questions)/i.test(a)
      if (strongGuarantee) return "Powerful guarantee. This eliminates the #1 objection — 'what if it doesn't work?'"
      return "Make it stronger. A '100% money back, no questions asked' guarantee outsells a weak one 10:1."
    },
  },
  {
    id: "pricing",
    question: "Price based on value, not cost. What's your price? Consider: total bonus value + core transformation value = total value. Your price should be a fraction of that.",
    coaching: (a: string) => {
      const price = parseInt(a.replace(/[^0-9]/g, ""), 10)
      if (isNaN(price)) return "Enter a number. Even a rough estimate helps calibrate the Value Equation."
      if (price <= 0) return "Your offer has value! Price it accordingly."
      if (price < 100) return "For a Grand Slam Offer, consider if you're pricing high enough. Value is perceived, not cost-based."
      if (price >= 1000) return "High-ticket. This signals premium transformation. Make sure the bonus stack justifies it."
      return "Solid mid-range pricing. Make sure your bonuses and guarantee outsized the price."
    },
  },
  {
    id: "naming",
    question: "Last one — name your offer. The best names contain: the time frame + the result. Make it memorable. What's it called?",
    coaching: (a: string) =>
      a.length > 10
        ? "Perfect. A strong name frames the entire offer. Let me synthesize your Grand Slam Offer."
        : "Short and punchy is good, but include the result. Like \"The 12-Week Body Transformation Accelerator.\"",
  },
]

const INTRO: Message = {
  role: "bot",
  text: "I'm your Hormozi-style Offer Coach. 🏋️\n\nWe're going to build a **Grand Slam Offer** — one so good people feel stupid saying no.\n\nI'll ask you 10 questions, one at a time. Just type your answers naturally.\n\nReady? Let's start with the first one.",
}

// ─── Component ───
export default function OfferBuilderClient() {
  const [stepIdx, setStepIdx] = useState(-1)
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [input, setInput] = useState("")
  const [offerData, setOfferData] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const askQuestion = (index: number) => {
    const step = STEPS[index]
    if (!step) return
    setMessages((prev) => [...prev, { role: "bot", text: step.question }])
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput("")

    const currentStep = STEPS[stepIdx]
    if (!currentStep) return

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text }])

    // Save data
    const newData = { ...offerData, [currentStep.id]: text }
    setOfferData(newData)

    // Coaching response
    const coach = currentStep.coaching(text)
    const nextIdx = stepIdx + 1
    const nextStep = STEPS[nextIdx]

    // Show coaching then next question (or done)
    setTimeout(() => {
      if (nextStep) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: coach },
          { role: "bot", text: nextStep.question },
        ])
        setStepIdx(nextIdx)
      } else {
        // All done — generate the Grand Slam summary
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: coach },
          { role: "bot", text: "🔥 **YOU'VE DONE IT.** Here's your Grand Slam Offer:" },
          { role: "bot", text: generateOfferSummary(newData) },
        ])
        setDone(true)
      }
    }, 400)
  }

  const handleStart = () => {
    setStepIdx(0)
    setMessages([INTRO])
    askQuestion(0)
  }

  const handleReset = () => {
    setStepIdx(-1)
    setMessages([INTRO])
    setOfferData({})
    setDone(false)
    setInput("")
  }

  if (stepIdx === -1) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500 mb-4">Hormozi Offer Coach</p>
          <h1 className="text-3xl font-bold mb-4 leading-tight">Build Your<br />Grand Slam Offer</h1>
          <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
            A guided conversation to build an offer so good people feel stupid saying no.
            Based on Alex Hormozi's Grand Slam Offer framework.
          </p>
          <Button onClick={handleStart} className="px-8 py-3 bg-white text-black text-sm font-medium hover:bg-neutral-200">
            Start Building
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-500">Offer Coach</span>
            <span className="text-xs text-neutral-600">|</span>
            <span className="text-xs text-neutral-500">
              Step {Math.min(stepIdx + 1, STEPS.length)} of {STEPS.length}
            </span>
          </div>
          <button onClick={handleReset} className="text-xs text-neutral-600 hover:text-white transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-white/5 text-neutral-200"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!done && (
        <div className="border-t border-white/10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend() }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Done — start over */}
      {done && (
        <div className="border-t border-white/10">
          <div className="max-w-3xl mx-auto px-4 py-4 text-center">
            <Button onClick={handleReset} className="px-6 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200">
              Build Another Offer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Grand Slam summary generator ───
function generateOfferSummary(data: Record<string, string>): string {
  const { product, dreamOutcome, problemAgitation, likelihood, timeDelay, effort, bonuses, riskReversal, pricing, scarcity, urgency, naming } = data

  const name = naming || product || "Your Grand Slam Offer"
  const price = pricing || "—"

  // Parse total bonus value
  const totalBonusValue = (() => {
    const amounts: number[] = []
    const re = /\$([0-9,]+)/g
    let m
    while ((m = re.exec(bonuses || "")) !== null) {
      const val = parseInt(m[1].replace(/,/g, ""), 10)
      if (!isNaN(val) && val < 1_000_000) amounts.push(val)
    }
    return amounts.reduce((sum, v) => sum + v, 0)
  })()

  return [
    `🔥 **${name}**`,
    ``,
    `**Price:** ${price}`,
    totalBonusValue > 0 ? `**Total Bonus Value:** \$${totalBonusValue.toLocaleString()}` : ``,
    `**Value Ratio:** ${totalBonusValue > 0 && pricing ? `${Math.round((totalBonusValue + (parseInt(pricing.replace(/[^0-9]/g, ""), 10) || 0)) / (parseInt(pricing.replace(/[^0-9]/g, ""), 10) || 1))}x` : "—"}`,
    ``,
    `━━━━━━━━━━━━━━━━━`,
    ``,
    problemAgitation ? `**The Problem:** ${problemAgitation}` : ``,
    product ? `**The Solution:** ${product}` : ``,
    dreamOutcome ? `**The Dream Outcome:** ${dreamOutcome}` : ``,
    likelihood ? `**Proof:** ${likelihood}` : ``,
    timeDelay ? `**Speed:** ${timeDelay}` : ``,
    effort ? `**Ease:** ${effort}` : ``,
    ``,
    bonuses ? `**Bonuses:**\n${bonuses}` : ``,
    ``,
    riskReversal ? `**Guarantee:** ${riskReversal}` : ``,
    urgency ? `**Urgency:** ${urgency}` : ``,
    scarcity ? `**Scarcity:** ${scarcity}` : ``,
    ``,
    `━━━━━━━━━━━━━━━━━`,
    ``,
    pricing ? `💵 **Price:** ${price}` : ``,
    ``,
    `**Offer Script (Star Sequence):**`,
    `1. ${problemAgitation?.split(".")[0] || "The problem..."}?`,
    `2. You've tried before...`,
    `3. Here's ${product || "the solution"}.`,
    `4. Imagine ${dreamOutcome || "the result"}.`,
    `5. Get there faster and easier.`,
    `6. ${likelihood?.split(".")[0] || "Others have succeeded."}`,
    `7. Get ${name} for ${price}.`,
    `8. Plus: ${bonuses?.split("\n")[0] || "exclusive bonuses"}.`,
    `9. Try it risk-free: ${riskReversal || "100% guarantee"}.`,
    `10. ${urgency || "Act now"} — ${scarcity || "limited availability"}.`,
  ]
    .filter(Boolean)
    .join("\n")
}
