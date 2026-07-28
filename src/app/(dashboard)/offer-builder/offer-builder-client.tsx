"use client"

import { useState, useCallback, useRef } from "react"
import {
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
} from "@/components/ui/message-scroller"
import { Message, MessageContent } from "@/components/ui/message"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Marker } from "@/components/ui/marker"
import { Button } from "@/components/ui/button"
import { SendIcon } from "lucide-react"

// ─── Chat message type ───
interface MessageData {
  role: "bot" | "user"
  text: string
  stepId?: string
}

// ─── Grand Slam Offer flow ───
interface OfferStep {
  id: string
  question: string
  coaching: (answer: string) => string
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

function generateOfferSummary(data: Record<string, string>): string {
  const { product, dreamOutcome, problemAgitation, likelihood, timeDelay, effort, bonuses, riskReversal, pricing, naming } = data

  const name = naming || product || "Your Grand Slam Offer"
  const price = pricing || "—"

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

  const priceNum = parseInt(pricing?.replace(/[^0-9]/g, "") || "0", 10)
  const valueRatio = totalBonusValue > 0 && priceNum > 0
    ? `${Math.round((totalBonusValue + priceNum) / priceNum)}x`
    : "—"

  return [
    `🔥 **${name}**`,
    ``,
    `**Price:** ${price}`,
    `**Total Bonus Value:** ${totalBonusValue > 0 ? `\$${totalBonusValue.toLocaleString()}` : "—"}`,
    `**Value Ratio:** ${valueRatio}`,
    ``,
    `━━━━━━━━━━━━━━━━━`,
    ``,
    problemAgitation ? `**The Problem:** ${problemAgitation}` : null,
    product ? `**The Solution:** ${product}` : null,
    dreamOutcome ? `**The Dream Outcome:** ${dreamOutcome}` : null,
    likelihood ? `**Proof:** ${likelihood}` : null,
    timeDelay ? `**Speed:** ${timeDelay}` : null,
    effort ? `**Ease:** ${effort}` : null,
    ``,
    bonuses ? `**Bonuses:**\n${bonuses}` : null,
    ``,
    riskReversal ? `**Guarantee:** ${riskReversal}` : null,
    ``,
    `━━━━━━━━━━━━━━━━━`,
    ``,
    pricing ? `💵 **Price:** ${price}` : null,
    ``,
    `**Star Sequence Script:**`,
    `1. "${(problemAgitation || "The problem...").split(".")[0]}..."`,
    `2. "You've tried before..."`,
    `3. "Here's ${(product || "the solution")}."`,
    `4. "Imagine ${(dreamOutcome || "the result")}."`,
    `5. "Get there faster and easier."`,
    `6. "${(likelihood || "Others have succeeded").split(".")[0]}."`,
    `7. "Get ${name} for ${price}."`,
    `8. "Plus: ${(bonuses || "exclusive bonuses").split("\n")[0]}."`,
    `9. "Try it risk-free: ${riskReversal || "100% guarantee"}."`,
    `10. "Act now — limited availability."`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n")
}

// ─── Inner component that uses MessageScroller hooks ───
function OfferChat({
  stepIdx,
  messages,
  done,
  onSend,
  onInputChange,
  input,
}: {
  stepIdx: number
  messages: MessageData[]
  done: boolean
  onSend: () => void
  onInputChange: (v: string) => void
  input: string
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const totalSteps = STEPS.length

  return (
    <div className="flex h-full flex-col">
      {/* Scroller */}
      <MessageScrollerViewport ref={viewportRef}>
        <MessageScrollerContent>
          {messages.map((msg, i) => (
            <MessageScrollerItem key={i} scrollAnchor={i === messages.length - 1}>
              <Message align={msg.role === "user" ? "end" : "start"}>
                <MessageContent>
                  <Bubble variant={msg.role === "user" ? "default" : "muted"} align={msg.role === "user" ? "end" : "start"}>
                    <BubbleContent className="whitespace-pre-wrap">
                      {msg.text}
                    </BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
            </MessageScrollerItem>
          ))}

          {/* Summary section when done */}
          {done && (
            <MessageScrollerItem>
              <Marker variant="separator">Your Grand Slam Offer</Marker>
            </MessageScrollerItem>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>

      {/* Input */}
      {!done && (
        <div className="border-t border-border p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); onSend() }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={
                  stepIdx === 0
                    ? "Type your answer..."
                    : "Your answer..."
                }
                className="w-full bg-muted border border-border rounded-none px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring pr-10"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {stepIdx + 1}/{totalSteps}
              </span>
            </div>
            <Button
              type="submit"
              disabled={!input.trim()}
              size="icon"
              className="shrink-0"
            >
              <SendIcon className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}

      {/* Done button */}
      {done && (
        <div className="border-t border-border p-4 text-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Build Another Offer
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───
export default function OfferBuilderClient() {
  const [started, setStarted] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [offerData, setOfferData] = useState<Record<string, string>>({})
  const [input, setInput] = useState("")
  const [done, setDone] = useState(false)
  const [thinking, setThinking] = useState(false)

  const addBotMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "bot", text }])
  }, [])

  const addUserMessage = useCallback((text: string, stepId?: string) => {
    setMessages((prev) => [...prev, { role: "user", text, stepId }])
  }, [])

  const handleStart = () => {
    setStarted(true)
    setMessages([
      {
        role: "bot",
        text:
          "I'm your Hormozi-style Offer Coach. 🏋️\n\nWe're going to build a **Grand Slam Offer** — one so good people feel stupid saying no.\n\nI'll ask you 10 questions, one at a time. Just type your answers naturally.",
      },
      { role: "bot", text: STEPS[0].question },
    ])
    setStepIdx(0)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || thinking) return
    setInput("")
    setThinking(true)

    const currentStep = STEPS[stepIdx]
    if (!currentStep) return

    addUserMessage(text, currentStep.id)

    const newData = { ...offerData, [currentStep.id]: text }
    setOfferData(newData)

    const coach = currentStep.coaching(text)
    const nextIdx = stepIdx + 1
    const nextStep = STEPS[nextIdx]

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 300))

    if (nextStep) {
      addBotMessage(coach)
      await new Promise((r) => setTimeout(r, 200))
      addBotMessage(nextStep.question)
      setStepIdx(nextIdx)
    } else {
      addBotMessage(coach)
      await new Promise((r) => setTimeout(r, 400))
      addBotMessage(generateOfferSummary(newData))
      setDone(true)
    }

    setThinking(false)
  }

  if (!started) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            Hormozi Offer Coach
          </p>
          <h1 className="text-3xl font-bold mb-4 leading-tight">Build Your<br />Grand Slam Offer</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            A guided conversation to build an offer so good people feel stupid saying no.
            Based on Alex Hormozi's Grand Slam Offer framework.
          </p>
          <Button onClick={handleStart}>
            Start Building
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Offer Coach
            </span>
            <span className="text-xs text-muted-foreground/50">|</span>
            <span className="text-xs text-muted-foreground">
              Step {Math.min(stepIdx + 1, STEPS.length)} of {STEPS.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStarted(false)
              setStepIdx(0)
              setMessages([])
              setOfferData({})
              setInput("")
              setDone(false)
            }}
          >
            Reset
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted shrink-0">
          <div
            className="h-full bg-foreground transition-all duration-500"
            style={{ width: `${((stepIdx + (done ? STEPS.length : 0)) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Chat */}
        <OfferChat
          stepIdx={stepIdx}
          messages={messages}
          done={done}
          onSend={handleSend}
          onInputChange={setInput}
          input={input}
        />
    </div>
  )
}
