/**
 * concept.service.ts — The Venture Concept Engine
 *
 * Turns a whitespace genome (atom-set with density 0) into a venture
 * concept with:
 *   - A deterministic, template-based name and tagline
 *   - Required capability atoms (mapped from genome atoms)
 *   - A viability score (from co-occurrence rarity)
 *
 * Naming is template-based and deterministic by default. If the env
 * var ANTHROPIC_API_KEY is set, an LLM enriches the name — but the
 * template output is always the fallback. LLM is garnish, never a
 * dependency (same approach as Alignment Report).
 *
 * Domain-agnostic: works for clinics, restaurants, farms, films,
 * and SaaS alike.
 */

import { prisma } from "@/lib/prisma"

export interface VentureConcept {
  /** Canonical genome hash */
  genomeHash: string
  /** The atom set (the "what") */
  atoms: string[]
  /** Deterministic generated name */
  name: string
  /** One-line tagline */
  tagline: string
  /** Required capability atoms to build this venture */
  requiredCapabilities: RequiredCapability[]
  /** Viability 0-100 (higher = less competition) */
  viability: number
}

export interface RequiredCapability {
  capabilityAtom: string
  sourceAtom: string
  sourceType: string
  label: string  // human-readable
}

// ─── Genome → Capability mapping rules ───

const CAPABILITY_RULES: Record<string, (atom: string) => string[]> = {
  industry: (atom) => [`${atom}_domain`],
  technology: (atom) => {
    // Special cases for specific tech atoms
    const map: Record<string, string[]> = {
      app: ["app_development"],
      ai: ["machine_learning", "ai_engineering"],
      machine_learning: ["machine_learning"],
      web: ["web_development"],
      blockchain: ["blockchain_development"],
      biotech: ["biotech_rd"],
      robotics: ["robotics_engineering"],
      iot: ["iot_engineering"],
      ar_vr: ["xr_development"],
      nlp: ["nlp_engineering"],
    }
    return map[atom] || [`${atom}_engineering`]
  },
  regulatory: () => ["regulatory_compliance"],
  delivery: (atom) => {
    const map: Record<string, string[]> = {
      on_demand: ["logistics_ops", "real_time_operations"],
      scheduled: ["operations_management"],
      autonomous: ["autonomous_systems"],
      physical: ["physical_ops"],
      digital: ["digital_ops", "platform_engineering"],
      hybrid: ["hybrid_ops"],
    }
    return map[atom] || [`${atom}_ops`]
  },
  business_model: (atom) => {
    const map: Record<string, string[]> = {
      b2c: ["consumer_growth"],
      b2b: ["enterprise_sales", "b2b_marketing"],
      b2b2c: ["partnership_development"],
      b2g: ["government_contracts"],
      marketplace: ["marketplace_ops", "two_sided_growth"],
      freemium: ["product_led_growth"],
      d2c: ["consumer_growth", "brand_building"],
      subscription: ["recurring_revenue"],
    }
    return map[atom] || [`${atom}_strategy`]
  },
  labor_model: (atom) => {
    const map: Record<string, string[]> = {
      gig_labor: ["workforce_management", "flexible_staffing"],
      freelance: ["talent_acquisition"],
      automated: ["automation_engineering"],
      crowdsourced: ["community_management"],
    }
    return map[atom] || [`${atom}_management`]
  },
  revenue_model: (atom) => {
    const map: Record<string, string[]> = {
      subscription: ["recurring_revenue"],
      advertising: ["monetization", "ad_ops"],
      commission: ["platform_economics"],
      licensing: ["ip_strategy"],
      hardware_margin: ["hardware_mfg_ops"],
    }
    return map[atom] || [`${atom}_strategy`]
  },
}

// ─── Deterministic name templates ───

const INDUSTRY_PREFIXES: Record<string, string[]> = {
  healthcare: ["Care", "Health", "Med", "Wellness"],
  transportation: ["Go", "Move", "Transit", "Ride"],
  agriculture: ["Grow", "Harvest", "Field", "Farm"],
  food: ["Taste", "Meal", "Kitchen", "Plate"],
  fintech: ["Pay", "Cash", "Pulse", "Flow"],
  education: ["Learn", "Mind", "Edu", "Spark"],
  energy: ["Volt", "Grid", "Watt", "Solar"],
  real_estate: ["Home", "Place", "Key", "Dwell"],
  entertainment: ["Stage", "Play", "Scene", "Reel"],
  legal: ["Bench", "Docket", "Clause"],
  security: ["Shield", "Guard", "Safe", "Vault"],
  // fallback prefixes for unrecognized industry atoms
}

const DELIVERY_SUFFIXES: Record<string, string[]> = {
  on_demand: ["Now", "On Demand", "Instant", "Go"],
  autonomous: ["Autonomous", "Self-Driving", "Automated"],
  scheduled: ["Scheduled", "Planned", "Booked"],
  physical: ["Delivery", "Carrier", "Logistics"],
  digital: ["App", "Platform", "Online", "Digital"],
  subscription: ["Plus", "Pro", "Premium", "Box"],
}

function pickName(atoms: string[]): { name: string; tagline: string } {
  // Find the industry atom for the prefix
  const industryAtom = atoms.find((a) =>
    ["healthcare", "transportation", "food", "agriculture", "fintech",
     "education", "energy", "entertainment", "legal", "security",
     "real_estate", "manufacturing", "media", "climate"].includes(a)
  )
  // Find the delivery/tech atom for the suffix
  const deliveryAtom = atoms.find((a) =>
    ["on_demand", "scheduled", "autonomous", "physical", "digital",
     "subscription"].includes(a)
  )

  const prefixes = (industryAtom && INDUSTRY_PREFIXES[industryAtom]) || ["Next", "New", "Modern"]
  const suffixes = (deliveryAtom && DELIVERY_SUFFIXES[deliveryAtom]) || [""]

  // Deterministic: use hash of atom set to pick template variant
  const hash = atoms.reduce((h, a) => h * 31 + a.length, 0)
  const prefix = prefixes[hash % prefixes.length]
  const suffix = suffixes[hash % suffixes.length]

  // Build the tagline from industry and what it enables
  const indLabel = industryAtom?.replace(/_/g, " ") || "modern"
  const delLabel = deliveryAtom?.replace(/_/g, " ") || "innovative"

  const name = suffix ? `${prefix}${suffix}` : `${prefix} ${indLabel.charAt(0).toUpperCase() + indLabel.slice(1)}`
  const tagline = `${delLabel.charAt(0).toUpperCase() + delLabel.slice(1)} ${indLabel} for everyone`

  return { name, tagline }
}

// ─── Viability score ───

async function computeViability(atoms: string[]): Promise<number> {
  // Viability = (100 - avg_cooccurrence_count) clamped to 0-100
  // A genome with rare atom pairs is more viable (less competition)
  if (atoms.length < 2) return 50

  let totalPairs = 0
  let sumCounts = 0

  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i]
      const b = atoms[j]
      const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
        "SELECT count FROM genome_co_occurs WHERE (atom_a = $1 AND atom_b = $2) OR (atom_a = $2 AND atom_b = $1)",
        a,
        b
      )
      const count = rows.length > 0 ? rows[0].count : 0
      sumCounts += count
      totalPairs++
    }
  }

  const avg = sumCounts / totalPairs
  // Lower average co-occurrence → higher viability
  const viability = Math.max(0, Math.min(100, 100 - avg))
  return Math.round(viability)
}

// ─── Public API ───

/**
 * Build a venture concept from a whitespace genome.
 * The genome should be an atom-set with density 0 (a whitespace).
 */
export async function buildConcept(atoms: string[]): Promise<VentureConcept> {
  const genomeHash = [...atoms].sort().join("|")
  const { name, tagline } = pickName(atoms)
  const viability = await computeViability(atoms)

  // Map each genome atom to required capabilities
  const requiredCapabilities: RequiredCapability[] = []

  for (const atom of atoms) {
    // Determine the atom type from the database
    const rows = await prisma.$queryRawUnsafe<{ atom_type: string }[]>(
      "SELECT atom_type FROM genome_atom_ontology WHERE atom = $1",
      atom
    )
    const atomType = rows.length > 0 ? rows[0].atom_type : "unknown"
    const rule = CAPABILITY_RULES[atomType]

    if (rule) {
      const capAtoms = rule(atom)
      for (const cap of capAtoms) {
        requiredCapabilities.push({
          capabilityAtom: cap,
          sourceAtom: atom,
          sourceType: atomType,
          label: cap.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        })
      }
    }
  }

  return {
    genomeHash,
    atoms,
    name,
    tagline,
    requiredCapabilities,
    viability,
  }
}

/**
 * Build concepts for multiple whitespace genomes in batch.
 */
export async function buildConcepts(atomSets: string[][]): Promise<VentureConcept[]> {
  return Promise.all(atomSets.map((atoms) => buildConcept(atoms)))
}

/**
 * Enrich a concept name via LLM if ANTHROPIC_API_KEY is set.
 * Template name is always the fallback. This is optional garnish.
 */
export async function enrichConceptName(
  concept: VentureConcept
): Promise<{ name: string; tagline: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { name: concept.name, tagline: concept.tagline }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `You are a venture naming expert. Given these atoms describing a business concept, generate a short company name (2-3 words) and a one-line tagline. Return ONLY JSON: {"name": "...", "tagline": "..."}\n\nAtoms: ${concept.atoms.join(", ")}`,
          },
        ],
      }),
    })
    if (!res.ok) return { name: concept.name, tagline: concept.tagline }
    const data = await res.json()
    try {
      const parsed = JSON.parse(data.content[0].text)
      return {
        name: parsed.name || concept.name,
        tagline: parsed.tagline || concept.tagline,
      }
    } catch {
      return { name: concept.name, tagline: concept.tagline }
    }
  } catch {
    return { name: concept.name, tagline: concept.tagline }
  }
}
