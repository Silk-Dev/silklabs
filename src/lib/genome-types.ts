// Shared types for the Genome Engine API

export interface LandingReport {
  operator: "evolve" | "regress" | "swap" | "validate"
  atom?: string
  original_genome?: string[]
  original_density?: number
  landing_hash: string
  landing_density: number
  classification: "WHITESPACE" | "COMPETITIVE" | "RED_OCEAN"
  nearest_companies: NearestCompany[]
  explanation: string
}

export interface NearestCompany {
  company_id: string
  jaccard_similarity: number
  matching_atoms: number
}

export interface GapsResponse {
  total_candidates: number
  whitespaces: WhitespaceEntry[]
  note: string
}

export interface WhitespaceEntry {
  hash: string
  atoms: string[]
  viability: number
  explanation: string
}

export interface TeamResponse {
  feasible: boolean
  optimal_team: string[]
  capability_coverage: { human: string; capability: string }[]
  total_viability: number
  missing_capabilities: string[]
  note: string
}

export interface VentureConcept {
  genomeHash: string
  atoms: string[]
  name: string
  tagline: string
  requiredCapabilities: { capabilityAtom: string; sourceAtom: string; sourceType: string; label: string }[]
  viability: number
}

// Atom type constants
export const ATOM_TYPE_HUES: Record<string, string> = {
  industry: "#60a5fa",
  business_model: "#f472b6",
  delivery: "#34d399",
  technology: "#a78bfa",
  labor_model: "#fb923c",
  revenue_model: "#f87171",
  regulatory: "#c084fc",
}

export const CLASSIFICATION_COLORS: Record<string, string> = {
  WHITESPACE: "#22c55e",
  COMPETITIVE: "#f59e0b",
  RED_OCEAN: "#ef4444",
}

