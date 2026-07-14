"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { questions, aiMessages } from "@/lib/onboarding-questions"
import { completeOnboarding } from "@/services/onboarding.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { Question } from "@/lib/onboarding-questions"

gsap.registerPlugin(useGSAP)

const regions = [
  "Africa", "Asia", "Australia", "Europe", "North America", "South America",
]

interface Answers {
  name?: string
  location?: string
  experience?: string
  partnerships?: string
  topSkill?: string
  motivation?: string
  commitment?: string
  lookingFor?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<{ role: "ai" | "user"; text: string }[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [visibleRegions, setVisibleRegions] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)

  const currentQuestion: Question | undefined = questions[step]

  useGSAP(() => {
    gsap.fromTo(
      ".onboarding-panel",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    )
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const addAiMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "ai", text }])
  }, [])

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", text }])
  }, [])

  useEffect(() => {
    if (currentQuestion) {
      const timer = setTimeout(() => {
        addAiMessage(aiMessages[currentQuestion.id] ?? currentQuestion.text)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [step, currentQuestion, addAiMessage])

  const handleTextSubmit = useCallback(() => {
    if (!inputValue.trim() || !currentQuestion) return
    addUserMessage(inputValue.trim())
    setAnswers((prev) => ({ ...prev, [currentQuestion.field]: inputValue.trim() }))
    setInputValue("")
    setStep((s) => s + 1)
  }, [inputValue, currentQuestion, addUserMessage])

  const handleChoice = useCallback(
    (value: string) => {
      if (!currentQuestion) return
      addUserMessage(value)
      setAnswers((prev) => ({ ...prev, [currentQuestion.field]: value }))

      if (currentQuestion.field === "location" && value === "No, give country") {
        setShowFollowUp(true)
      } else {
        setStep((s) => s + 1)
      }
    },
    [currentQuestion, addUserMessage]
  )

  const handleFollowUp = useCallback(() => {
    if (!inputValue.trim()) return
    addUserMessage(inputValue.trim())
    setAnswers((prev) => ({ ...prev, location: inputValue.trim() }))
    setInputValue("")
    setShowFollowUp(false)
    setStep((s) => s + 1)
  }, [inputValue, addUserMessage])

  const handleRegionsSubmit = useCallback(() => {
    addUserMessage(isPublic ? "Public" : "Private")
    setSubmitting(true)
    completeOnboarding({
      ...answers,
      isPublic,
      visibleRegions,
    }).then(() => {
      router.push("/discover")
    })
  }, [answers, isPublic, visibleRegions, addUserMessage, router])

  const canProceed = (() => {
    if (!currentQuestion) return false
    if (currentQuestion.type === "text" || currentQuestion.type === "upload") return true
    if (currentQuestion.type === "chips" || currentQuestion.type === "choice") return true
    if (currentQuestion.type === "regions") return true
    return true
  })()

  const renderInput = () => {
    if (!currentQuestion) return null

    if (currentQuestion.type === "text") {
      if (currentQuestion.id === 5) {
        return (
          <div className="space-y-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="I'm a designer with 5 years of experience in..."
              className="min-h-[100px] resize-none border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleTextSubmit()
                }
              }}
            />
            <Button
              onClick={handleTextSubmit}
              className="w-full font-mono text-[11px] uppercase tracking-[0.08em]"
            >
              Send
            </Button>
          </div>
        )
      }
      return (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                showFollowUp ? handleFollowUp() : handleTextSubmit()
              }
            }}
            autoFocus
          />
          <Button
            onClick={() => (showFollowUp ? handleFollowUp() : handleTextSubmit())}
            className="font-mono text-[11px] uppercase tracking-[0.08em]"
          >
            Send
          </Button>
        </div>
      )
    }

    if (currentQuestion.type === "choice") {
      if (showFollowUp) {
        return (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent">
              Which country?
            </p>
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. France, Japan..."
                className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleFollowUp()
                  }
                }}
                autoFocus
              />
              <Button onClick={handleFollowUp} className="font-mono text-[11px] uppercase tracking-[0.08em]">
                Send
              </Button>
            </div>
          </div>
        )
      }
      return (
        <div className="flex flex-wrap gap-2">
          {currentQuestion.options?.map((opt) => (
            <button
              key={opt}
              onClick={() => handleChoice(opt)}
              className="rounded-full border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-[12px] text-accent transition-all hover:bg-accent/15 hover:border-accent/60 active:scale-95"
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    if (currentQuestion.type === "regions") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="public-profile"
              checked={isPublic}
              onCheckedChange={(v) => setIsPublic(v === true)}
              className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-[#0d1515]"
            />
            <Label htmlFor="public-profile" className="font-mono text-[12px] text-primary">
              Public profile
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {regions.map((region) => (
              <button
                key={region}
                onClick={() =>
                  setVisibleRegions((prev) =>
                    prev.includes(region)
                      ? prev.filter((r) => r !== region)
                      : [...prev, region]
                  )
                }
                className={`rounded-md border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-all ${
                  visibleRegions.includes(region)
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border-metal bg-[#0d1515] text-outline hover:border-accent/50 hover:text-accent/70"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRegionsSubmit}
            disabled={submitting}
            className="w-full font-mono text-[11px] uppercase tracking-[0.08em]"
          >
            {submitting ? "Creating Profile..." : "Complete Profile"}
          </Button>
        </div>
      )
    }

    return null
  }

  const previewAnswers: Answers = { ...answers }

  const tldr = generateTldr(answers)

  return (
    <div className="relative flex min-h-screen bg-[#0d1515]">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="onboarding-panel relative z-10 flex w-full">
        {/* Chat panel */}
        <div className="flex flex-1 flex-col border-r border-border-metal">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-border-metal px-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/silklearn.avif" alt="SILKLABS" width={28} height={28} />
              <span className="font-heading text-base font-bold tracking-tight text-primary">
                SILKLABS
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-outline">
                Step {step + 1}/{questions.length}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border-metal">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </header>

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
          >
            {messages.length === 0 && (
              <div className="flex items-center gap-3 text-outline">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                  <span className="font-mono text-[10px] text-accent">AI</span>
                </div>
                <p className="font-mono text-[12px] leading-relaxed text-outline">
                  Hey there! I&apos;m your AI Cofounder. Let&apos;s set up your profile so
                  you can find the right people to build with.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message-bubble flex items-start gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {msg.role === "ai" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <span className="font-mono text-[10px] text-accent">AI</span>
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    msg.role === "ai"
                      ? "bg-surface text-primary"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  <p className="font-mono text-[13px] leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {currentQuestion && !messages[messages.length - 1]?.text.startsWith(currentQuestion.text) && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <span className="font-mono text-[10px] text-accent">AI</span>
                </div>
                <p className="font-mono text-[13px] leading-relaxed text-primary">
                  {currentQuestion.subtitle}
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border-metal px-4 py-4">
            {renderInput()}
          </div>
        </div>

        {/* Profile preview panel */}
        <div
          ref={profileRef}
          className="hidden w-[340px] shrink-0 bg-gradient-to-b from-[rgba(25,33,34,0.6)] to-[rgba(13,21,21,0.8)] p-5 lg:block"
        >
          <div className="sticky top-4 space-y-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-outline">
              Profile Preview
            </h3>

            <div className="rounded-xl border border-border-metal bg-surface/50 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border border-border-metal">
                  <AvatarFallback className="bg-accent/10 font-heading text-lg text-accent">
                    {(answers.name ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-heading text-base font-semibold text-primary">
                    {answers.name || "Your Name"}
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
                    {answers.location || "Location"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">
                TL;DR
              </h4>
              <p className="font-mono text-[11px] leading-relaxed text-primary/80">
                {tldr}
              </p>
            </div>

            <Separator className="bg-border-metal" />

            <div className="space-y-2">
              <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">
                Details
              </h4>
              <div className="space-y-1">
                {answers.experience && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-outline">Experience</span>
                    <span className="font-mono text-[10px] text-accent">{answers.experience}</span>
                  </div>
                )}
                {answers.partnerships && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-outline">Partnership</span>
                    <span className="font-mono text-[10px] text-accent">{answers.partnerships}</span>
                  </div>
                )}
                {answers.motivation && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-outline">Motivation</span>
                    <span className="font-mono text-[10px] text-accent">{answers.motivation}</span>
                  </div>
                )}
                {answers.commitment && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] text-outline">Commitment</span>
                    <span className="font-mono text-[10px] text-accent">{answers.commitment}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-border-metal" />

            <div className="space-y-2">
              <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">
                Top Skill
              </h4>
              <p className="font-mono text-[11px] leading-relaxed text-primary/80">
                {answers.topSkill || "Not specified yet"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function generateTldr(answers: Answers): string {
  const parts: string[] = []
  if (answers.name) parts.push(answers.name)
  if (answers.location) {
    const loc = answers.location === "Yes I am!" ? "US" : answers.location
    parts.push(`(based in ${loc})`)
  }
  if (answers.topSkill) {
    const skill = answers.topSkill.split(".")[0].split("\n")[0].toLowerCase()
    parts.push(`skilled in ${skill}`)
  }
  if (answers.motivation) {
    const short = answers.motivation.length > 40 ? answers.motivation.slice(0, 40) + "..." : answers.motivation
    parts.push(`motivated by "${short}"`)
  }
  return parts.length > 0 ? parts.join(" ") + "." : "A new member of Silklabs."
}
