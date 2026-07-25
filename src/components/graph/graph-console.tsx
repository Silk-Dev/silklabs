"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { ATOM_TYPE_HUES, CLASSIFICATION_COLORS } from "@/lib/genome-types"
import type { LandingReport, WhitespaceEntry, VentureConcept } from "@/lib/genome-types"
import BuildThisBlueprint from "./build-this-blueprint"

// Lazy-load the heavy canvas component (SSR disabled)
const GraphCanvas = dynamic(() => import("@/components/graph/graph-client"), { ssr: false })

// ─── Types ───

type Mode = "decompose" | "mutate" | "recombine" | "gaps" | "validate"

interface MutationStep {
  operator: string
  label: string
  classification: string
  atoms: string[]
}

// ─── Mode Config ───

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "decompose", label: "Decompose", icon: "⊞" },
  { id: "mutate", label: "Mutate", icon: "⟳" },
  { id: "recombine", label: "Recombine", icon: "⨯" },
  { id: "gaps", label: "Gaps", icon: "◇" },
  { id: "validate", label: "Validate", icon: "✓" },
]

// ─── Atom Color Helpers ───

const ATOM_TYPE_NAMES: Record<string, string> = {
  industry: "Industry", business_model: "Business Model", delivery: "Delivery",
  technology: "Technology", labor_model: "Labor Model",
  revenue_model: "Revenue Model", regulatory: "Regulatory",
}

// ─── Genome Inspector ───

function GenomeInspector({
  genome,
  density,
  classification,
  atomTypes,
  explanation,
  onClose,
  onBuildThis,
}: {
  genome: string[]
  density: number
  classification: string
  atomTypes: Record<string, string>
  explanation?: string
  onClose?: () => void
  onBuildThis?: () => void
}) {
  // Group atoms by type
  const byType: Record<string, string[]> = {}
  for (const atom of genome) {
    const t = atomTypes[atom] || "unknown"
    ;(byType[t] = byType[t] || []).push(atom)
  }

  return (
    <div className="space-y-4">
      {/* Density readout */}
      <div className="text-center py-3 border-b border-zinc-700/50">
        <div className="text-3xl font-bold tabular-nums">{density}</div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">Companies share this genome</div>
      </div>

      {/* Classification badge */}
      <div className="flex justify-center">
        <span
          className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm"
          style={{
            backgroundColor: CLASSIFICATION_COLORS[classification] + "22",
            color: CLASSIFICATION_COLORS[classification],
            border: `1px solid ${CLASSIFICATION_COLORS[classification]}44`,
          }}
        >
          {classification === "WHITESPACE" ? "◇ WHITESPACE — Opportunity" : classification}
        </span>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-xs text-zinc-400 italic leading-relaxed">{explanation}</p>
      )}

      {/* Atoms grouped by type */}
      <div className="space-y-2">
        {Object.entries(byType).map(([type, atoms]) => (
          <div key={type}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              {ATOM_TYPE_NAMES[type] || type}
            </div>
            <div className="flex flex-wrap gap-1">
              {atoms.map((a) => (
                <span
                  key={a}
                  className="inline-block px-2 py-0.5 text-xs font-mono rounded-sm"
                  style={{
                    backgroundColor: (ATOM_TYPE_HUES[type] || "#888") + "22",
                    color: ATOM_TYPE_HUES[type] || "#888",
                    border: `1px solid ${(ATOM_TYPE_HUES[type] || "#888") + "44"}`,
                  }}
                >
                  {a.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Build This button — only for WHITESPACE */}
      {classification === "WHITESPACE" && onBuildThis && (
        <button
          onClick={onBuildThis}
          className="w-full py-2 text-xs font-bold rounded-sm transition-all"
          style={{
            backgroundColor: CLASSIFICATION_COLORS.WHITESPACE,
            color: "#052e16",
          }}
        >
          ⚡ Build This
        </button>
      )}

      {onClose && (
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back
        </button>
      )}
    </div>
  )
}

// ─── Path Trail ───

function PathTrail({ steps, onRewind }: { steps: MutationStep[]; onRewind: (i: number) => void }) {
  if (steps.length === 0) return null
  return (
    <div className="flex items-center gap-1 text-xs font-mono px-4 py-2 overflow-x-auto whitespace-nowrap">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <button
            onClick={() => onRewind(i)}
            className="hover:text-white transition-colors"
          >
            {i === 0 ? s.label : (
              <span>
                <span className="text-zinc-500 mx-1">→</span>
                <span style={{ color: CLASSIFICATION_COLORS[s.classification] }}>
                  {s.operator} {s.label}
                </span>
              </span>
            )}
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Gap Card ───

function GapCard({ entry }: { entry: WhitespaceEntry }) {
  return (
    <div className="border border-green-500/30 bg-green-950/10 rounded-sm p-3 space-y-1">
      <div className="text-xs font-mono text-green-400">
        {entry.atoms.map((a) => a.replace(/_/g, " ")).join(" · ")}
      </div>
      <div className="text-[10px] text-zinc-400">
        Viability: {entry.viability.toFixed(0)} · {entry.explanation}
      </div>
    </div>
  )
}

// ─── Main Console ───

export default function GraphConsole() {
  const [mode, setMode] = useState<Mode>("decompose")
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [selectedGenome, setSelectedGenome] = useState<string[]>([])
  const [selectedDensity, setSelectedDensity] = useState(0)
  const [selectedClassification, setSelectedClassification] = useState("WHITESPACE")
  const [selectedExplanation, setSelectedExplanation] = useState("")
  const [genomeStatus, setGenomeStatus] = useState<"idle" | "loading" | "online" | "offline">("idle")
  const [mutationSteps, setMutationSteps] = useState<MutationStep[]>([])
  const [gaps, setGaps] = useState<WhitespaceEntry[]>([])
  const [gapsLoading, setGapsLoading] = useState(false)
  const [atomTypes, setAtomTypes] = useState<Record<string, string>>({})
  const [validateAtoms, setValidateAtoms] = useState<string[]>([])
  const [allAtoms, setAllAtoms] = useState<string[]>([])

  // Build This state
  const [showBlueprint, setShowBlueprint] = useState(false)
  const [blueprintConcept, setBlueprintConcept] = useState<VentureConcept | null>(null)
  const [blueprintLoading, setBlueprintLoading] = useState(false)

  // ── Genome Service Health Check ──

  useEffect(() => {
    setGenomeStatus("loading")
    fetch("/api/genome/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atoms: ["healthcare"] }),
    })
      .then((r) => {
        if (r.ok) setGenomeStatus("online")
        else setGenomeStatus("offline")
      })
      .catch(() => setGenomeStatus("offline"))
  }, [])

  // ── Load Atom Types ──

  useEffect(() => {
    fetch("/api/genome/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atoms: ["healthcare", "b2c", "app"] }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.types) setAtomTypes(d.types)
      })
      .catch(() => {})
  }, [])

  // ── Load gaps ──

  const loadGaps = useCallback(async () => {
    setGapsLoading(true)
    try {
      const res = await fetch("/api/genome/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      })
      const data = await res.json()
      setGaps(data.whitespaces || [])
      if (data.whitespaces) {
        // Collect all atom types from gaps
        const types: Record<string, string> = { ...atomTypes }
        for (const w of data.whitespaces) {
          for (const a of w.atoms) {
            if (!types[a]) types[a] = "industry" // fallback
          }
        }
        setAtomTypes(types)
      }
    } catch {
      // ignore
    }
    setGapsLoading(false)
  }, [atomTypes])

  useEffect(() => {
    if (mode === "gaps") loadGaps()
  }, [mode, loadGaps])

  // ── Validate atoms ──

  const handleValidate = useCallback(async (atoms: string[]) => {
    setGenomeStatus("loading")
    try {
      const res = await fetch("/api/genome/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atoms }),
      })
      const data: LandingReport = await res.json()
      setSelectedGenome(atoms)
      setSelectedDensity(data.landing_density)
      setSelectedClassification(data.classification)
      setSelectedExplanation(data.explanation)
      if (data.nearest_companies) {
        setSelectedCompany(data.nearest_companies[0]?.company_id || null)
      }
      if (data.classification === "WHITESPACE") {
        // Add to path trail
        setMutationSteps((prev) => [
          ...prev,
          { operator: "validate", label: atoms.join(", "), classification: data.classification, atoms },
        ])
      }
    } catch {
      setGenomeStatus("offline")
    }
    setGenomeStatus("online")
  }, [])

  // ── Mutate company ──

  const handleMutate = useCallback(async (companyId: string, atom: string, operator: string) => {
    setGenomeStatus("loading")
    try {
      const res = await fetch(`/api/genome/${operator}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          operator === "evolve"
            ? { company_id: companyId, atom }
            : operator === "regress"
              ? { company_id: companyId, atom }
              : { company_id: companyId, old_atom: atom, new_atom: atom }
        ),
      })
      const data: LandingReport = await res.json()
      setSelectedGenome(data.original_genome || [])
      setSelectedDensity(data.landing_density)
      setSelectedClassification(data.classification)
      setSelectedExplanation(data.explanation)
      if (data.nearest_companies) {
        setSelectedCompany(data.nearest_companies[0]?.company_id || null)
      }
      // Add step
      setMutationSteps((prev) => [
        ...prev,
        {
          operator: operator === "evolve" ? "+" : operator === "regress" ? "−" : "~",
          label: atom.replace(/_/g, " "),
          classification: data.classification,
          atoms: data.original_genome || [],
        },
      ])
    } catch {
      setGenomeStatus("offline")
    }
    setGenomeStatus("online")
  }, [])

  // ── Recombine two companies ──

  const [recombineA, setRecombineA] = useState<string[]>([])
  const [recombineB, setRecombineB] = useState<string[]>([])
  const [recombineResults, setRecombineResults] = useState<{ atoms: string[]; density: number }[]>([])
  const [recombineAInput, setRecombineAInput] = useState("")
  const [recombineBInput, setRecombineBInput] = useState("")

  const handleRecombine = useCallback(async () => {
    if (recombineA.length === 0 || recombineB.length === 0) return
    // Cross-breed: take union, then generate viable subsets
    const union = [...new Set([...recombineA, ...recombineB])]
    const results: { atoms: string[]; density: number }[] = []

    // Check each atom removal
    for (const atom of union) {
      const subset = union.filter((a) => a !== atom)
      if (subset.length >= 2) {
        try {
          const res = await fetch("/api/genome/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ atoms: subset }),
          })
          const data = await res.json()
          results.push({
            atoms: subset,
            density: data.landing_density,
          })
        } catch {
          // skip
        }
      }
    }
    setRecombineResults(results.slice(0, 20))
  }, [recombineA, recombineB])

  // ── Build This handler ──

  const handleBuildThis = useCallback(async () => {
    if (selectedGenome.length === 0) return
    setBlueprintLoading(true)
    try {
      const res = await fetch("/api/genome/concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atoms: selectedGenome }),
      })
      if (res.ok) {
        const concept = await res.json()
        setBlueprintConcept(concept)
        setShowBlueprint(true)
      }
    } catch {
      // silent
    }
    setBlueprintLoading(false)
  }, [selectedGenome])

  // ── Render ──

  return (
    <div className="relative w-full h-full flex">
      {/* Mode Rail — left side */}
      <div className="flex flex-col items-center gap-1 pt-16 px-2 border-r border-zinc-800 bg-zinc-950/80 z-10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`w-10 h-10 flex items-center justify-center text-sm rounded-sm transition-all ${
              mode === m.id
                ? "bg-white/10 text-white border border-white/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
            title={m.label}
          >
            <span className="text-lg">{m.icon}</span>
          </button>
        ))}
        <div className="mt-auto mb-4">
          <span
            className={`block w-2 h-2 rounded-full ${
              genomeStatus === "online" ? "bg-green-500" : genomeStatus === "offline" ? "bg-red-500" : "bg-yellow-500 animate-pulse"
            }`}
            title={`Genome Engine: ${genomeStatus}`}
          />
        </div>
      </div>

      {/* Canvas Area — center, full-bleed */}
      <div className="flex-1 relative">
        <GraphCanvas genomeMode={mode} genomeAtoms={selectedGenome} />
        {/* Build This blueprint overlay */}
        {showBlueprint && blueprintConcept && (
          <BuildThisBlueprint
            genomeHash={blueprintConcept.genomeHash}
            atoms={blueprintConcept.atoms}
            conceptName={blueprintConcept.name}
            tagline={blueprintConcept.tagline}
            requiredCapabilities={blueprintConcept.requiredCapabilities}
            viability={blueprintConcept.viability}
            onClose={() => setShowBlueprint(false)}
            onNotify={(team) => {
              setShowBlueprint(false)
              setMutationSteps((prev) => [
                ...prev,
                { operator: "⚡", label: "Team drafted", classification: "WHITESPACE", atoms: selectedGenome },
              ])
            }}
          />
        )}
        {showBlueprint && blueprintLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
            <div className="text-sm text-zinc-400 animate-pulse">Generating venture concept...</div>
          </div>
        )}
      </div>

      {/* Right Panel — genome inspector + mode content */}
      <div className="w-[340px] border-l border-zinc-800 bg-zinc-950/90 overflow-y-auto z-10 flex flex-col">
        {/* Path Trail */}
        <div className="border-b border-zinc-800 bg-zinc-900/50 min-h-[32px]">
          <PathTrail
            steps={mutationSteps}
            onRewind={(i) => setMutationSteps((prev) => prev.slice(0, i + 1))}
          />
        </div>

        {/* Genome Engine Status Banner */}
        {genomeStatus === "offline" && (
          <div className="mx-3 mt-2 p-2 text-xs bg-red-950/50 border border-red-800/50 text-red-400 rounded-sm">
            Genome Engine offline. The genome service is not available.
          </div>
        )}

        <div className="flex-1 p-3 space-y-4 overflow-y-auto">
          {/* Mode content */}
          {mode === "decompose" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Decompose</h2>
              <p className="text-xs text-zinc-500">
                Select a company from the graph to see its genome decomposition.
              </p>
              {selectedGenome.length > 0 && (
                <GenomeInspector
                  genome={selectedGenome}
                  density={selectedDensity}
                  classification={selectedClassification}
                  atomTypes={atomTypes}
                  explanation={selectedExplanation}
                  onBuildThis={handleBuildThis}
                />
              )}
            </div>
          )}

          {mode === "mutate" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Mutate</h2>
              <p className="text-xs text-zinc-500">
                Select a company, then add (+) or remove (−) atoms.
              </p>
              {selectedGenome.length > 0 && (
                <div className="space-y-3">
                  <GenomeInspector
                    genome={selectedGenome}
                    density={selectedDensity}
                    classification={selectedClassification}
                    atomTypes={atomTypes}
                    explanation={selectedExplanation}
                    onBuildThis={handleBuildThis}
                  />
                  {/* Operator buttons */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] uppercase tracking-widest text-zinc-500">Evolve (+)</h3>
                    <div className="flex flex-wrap gap-1">
                      {/* Show atoms not in genome for evolve */}
                      {Object.entries(atomTypes).slice(0, 30).map(([atom, type]) => (
                        !selectedGenome.includes(atom) && (
                          <button
                            key={atom}
                            onClick={() => handleMutate(selectedCompany || "26645", atom, "evolve")}
                            className="px-2 py-0.5 text-[10px] font-mono rounded-sm border border-zinc-700 hover:border-green-500/50 hover:bg-green-950/20 transition-colors"
                            style={{ color: ATOM_TYPE_HUES[type] || "#888" }}
                          >
                            + {atom.replace(/_/g, " ")}
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "recombine" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Recombine</h2>
              <p className="text-xs text-zinc-500">
                Cross-breed two companies to find viable hybrids.
              </p>
              <Input
                placeholder="Company A atoms (comma-separated)"
                value={recombineAInput}
                onChange={(e) => setRecombineAInput(e.target.value)}
                onBlur={() => setRecombineA(recombineAInput.split(",").map((s) => s.trim()).filter(Boolean))}
              />
              <Input
                placeholder="Company B atoms (comma-separated)"
                value={recombineBInput}
                onChange={(e) => setRecombineBInput(e.target.value)}
                onBlur={() => setRecombineB(recombineBInput.split(",").map((s) => s.trim()).filter(Boolean))}
              />
              <button
                onClick={handleRecombine}
                className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors"
              >
                Cross-breed →
              </button>
              {recombineResults.map((r, i) => (
                <div key={i} className="border border-zinc-700/50 rounded-sm p-2 text-[10px] font-mono text-zinc-300">
                  {r.atoms.join(" · ")} — density {r.density}
                </div>
              ))}
            </div>
          )}

          {mode === "gaps" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Gaps</h2>
              <p className="text-xs text-zinc-500">
                Browse whitespace opportunities — atom-sets no company occupies.
              </p>
              {gapsLoading ? (
                <div className="text-xs text-zinc-500 animate-pulse">Loading gaps...</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] text-zinc-500">
                    {gaps.length} whitespaces found
                    <span className="ml-1 text-zinc-600">(heuristic enumeration)</span>
                  </div>
                  {gaps.slice(0, 20).map((g, i) => (
                    <GapCard key={i} entry={g} />
                  ))}
                </div>
              )}
              <button
                onClick={loadGaps}
                className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-sm transition-colors"
              >
                ↻ Refresh Gaps
              </button>
            </div>
          )}

          {mode === "validate" && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Validate</h2>
              <p className="text-xs text-zinc-500">
                Type any set of atoms to check if the genome exists and its classification.
              </p>
              <textarea
                className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-2 text-xs font-mono text-zinc-200 resize-none h-20"
                placeholder="healthcare, b2c, on_demand, app"
                onChange={(e) => setValidateAtoms(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
              <button
                onClick={() => handleValidate(validateAtoms)}
                disabled={validateAtoms.length === 0}
                className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-sm transition-colors"
              >
                Validate →
              </button>
              {selectedGenome.length > 0 && (
                <GenomeInspector
                  genome={selectedGenome}
                  density={selectedDensity}
                  classification={selectedClassification}
                  atomTypes={atomTypes}
                  explanation={selectedExplanation}
                  onBuildThis={handleBuildThis}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple Input component for recombine
function Input({ placeholder, value, onChange, onBlur }: {
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
}) {
  return (
    <input
      className="w-full bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-xs font-mono text-zinc-200"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
    />
  )
}
