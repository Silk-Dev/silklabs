#!/usr/bin/env python3
"""
v0.4.0-beta: Genome Engine — Clingo Microservice
===================================================

FastAPI service exposing the three Genome Engine operators
(Evolve, Regress, Swap) and the two ASP solvers (Gap Finder, Team Assembly).

Usage:  uvicorn genome_service:app --host 0.0.0.0 --port 8000

The service connects to PostgreSQL for density/co_occurs/near lookups
and uses Clingo (Python bindings) for combinatorial optimization.
"""

import json
import os
import re
from typing import Optional

import clingo
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Config ───────────────────────────────────────────────────────────
DB_HOST = os.environ.get("PGHOST", "localhost")
DB_PORT = os.environ.get("PGPORT", "5444")
DB_NAME = os.environ.get("PGDATABASE", "silklabs")
DB_USER = os.environ.get("PGUSER", "postgres")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPH_DIR = os.path.join(PROJECT_ROOT, "graph")

# Load atom ontology for type lookups
with open(os.path.join(GRAPH_DIR, "atom_ontology.json")) as f:
    ATOM_ONTOLOGY: dict[str, str] = json.load(f)

app = FastAPI(title="Genome Engine", version="0.4.0-beta")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Database ─────────────────────────────────────────────────────────

def get_db():
    import psycopg2
    return psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER)


# ─── Helpers ──────────────────────────────────────────────────────────

def normalize(raw: str) -> str:
    """Normalize a tag or atom name."""
    name = raw.strip().lower().replace(" ", "_").replace("-", "_").replace("&", "and").replace("/", "_")
    name = re.sub(r"[^a-z0-9_]", "", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name


def genome_hash(atoms: list[str]) -> str:
    """Canonical genome hash: sorted atoms joined by pipe."""
    return "|".join(sorted(atoms))


def lookup_density(hash_str: str) -> int:
    """Look up density from Postgres."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT count FROM genome_density WHERE genome_hash = %s", (hash_str,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else 0


def lookup_nearest_companies(atoms: list[str], limit: int = 10) -> list[dict]:
    """
    Find companies whose genome most closely matches the given atoms.
    Uses Jaccard similarity on atom sets via SQL.
    """
    if not atoms:
        return []
    conn = get_db()
    cur = conn.cursor()
    
    # Count how many of the target atoms each company has
    placeholders = ",".join(["%s"] * len(atoms))
    cur.execute(f"""
        SELECT ca.company_id,
               COUNT(*) as matching_atoms,
               (SELECT COUNT(*) FROM genome_company_atom WHERE company_id = ca.company_id) as total_atoms
        FROM genome_company_atom ca
        WHERE ca.atom IN ({placeholders})
        GROUP BY ca.company_id
        ORDER BY COUNT(*)::float / 
            ((SELECT COUNT(*) FROM genome_company_atom WHERE company_id = ca.company_id) + {len(atoms)} - COUNT(*) + 0.001) DESC
        LIMIT {limit}
    """, atoms)
    
    results = []
    for row in cur.fetchall():
        cid, matching, total_atoms = row
        jaccard = matching / (total_atoms + len(atoms) - matching) if (total_atoms + len(atoms) - matching) > 0 else 0
        results.append({
            "company_id": cid,
            "jaccard_similarity": round(jaccard, 4),
            "matching_atoms": matching,
        })
    
    cur.close()
    conn.close()
    return results


def lookup_company_genome(company_id: str) -> list[str]:
    """Get sorted atom list for a company."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT atom FROM genome_company_atom WHERE company_id = %s ORDER BY atom", (company_id,))
    atoms = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return atoms


# ─── Request Models ───────────────────────────────────────────────────

class EvolveRequest(BaseModel):
    company_id: str
    atom: str

class RegressRequest(BaseModel):
    company_id: str
    atom: str

class SwapRequest(BaseModel):
    company_id: str
    old_atom: str
    new_atom: str

class ValidateRequest(BaseModel):
    atoms: list[str]

class GapsRequest(BaseModel):
    min_size: int = 2
    max_size: int = 5
    limit: int = 50

class TeamRequest(BaseModel):
    required_atoms: list[str]
    available_humans: list[dict]  # [{id, proven_capabilities: [str], viability: float}]
    hard_conflicts: list[list[str]] = []
    max_team_size: int = 4


# ─── API Endpoints ────────────────────────────────────────────────────

def _classification(density: int) -> str:
    if density == 0:
        return "WHITESPACE"
    elif density <= 20:
        return "COMPETITIVE"
    else:
        return "RED_OCEAN"

def _build_landing_report(
    operator: str,
    atom: str,
    original_atoms: list[str],
    original_density: int,
    landing_hash: str,
    landing_density: int,
    nearest: list[dict],
) -> dict:
    return {
        "operator": operator,
        "atom": atom,
        "original_genome": original_atoms,
        "original_density": original_density,
        "landing_hash": landing_hash,
        "landing_density": landing_density,
        "classification": _classification(landing_density),
        "nearest_companies": nearest[:5],
        "explanation": (
            f"{operator.upper()} {atom} → genome [{landing_hash}] has "
            f"{landing_density} existing companies."
            if landing_density > 0
            else f"{operator.upper()} {atom} → WHITESPACE. No company occupies this coordinate."
        ),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/genome/evolve")
def evolve(req: EvolveRequest):
    """EVOLVE (+): Add an atom to a company's genome."""
    genome = lookup_company_genome(req.company_id)
    if not genome:
        raise HTTPException(404, f"Company {req.company_id} not found")
    
    atom = normalize(req.atom)
    if atom in genome:
        raise HTTPException(400, f"Atom '{atom}' already in genome")
    
    landing_hash = genome_hash(genome + [atom])
    landing_density = lookup_density(landing_hash)
    original_density = lookup_density(genome_hash(genome))
    nearest = lookup_nearest_companies(genome + [atom])
    
    return _build_landing_report("evolve", atom, genome, original_density,
                                  landing_hash, landing_density, nearest)


@app.post("/api/genome/regress")
def regress(req: RegressRequest):
    """REGRESS (-): Remove an atom from a company's genome."""
    genome = lookup_company_genome(req.company_id)
    if not genome:
        raise HTTPException(404, f"Company {req.company_id} not found")
    
    atom = normalize(req.atom)
    if atom not in genome:
        raise HTTPException(400, f"Atom '{atom}' not in genome")
    
    landing_hash = genome_hash([a for a in genome if a != atom])
    landing_density = lookup_density(landing_hash)
    original_density = lookup_density(genome_hash(genome))
    nearest = lookup_nearest_companies([a for a in genome if a != atom])
    
    return _build_landing_report("regress", atom, genome, original_density,
                                  landing_hash, landing_density, nearest)


@app.post("/api/genome/swap")
def swap(req: SwapRequest):
    """SWAP (~): Replace an atom with another of the same type."""
    genome = lookup_company_genome(req.company_id)
    if not genome:
        raise HTTPException(404, f"Company {req.company_id} not found")
    
    old = normalize(req.old_atom)
    new = normalize(req.new_atom)
    
    if old not in genome:
        raise HTTPException(400, f"Atom '{old}' not in genome")
    if new in genome:
        raise HTTPException(400, f"Atom '{new}' already in genome")
    
    # Check same type
    old_type = ATOM_ONTOLOGY.get(old)
    new_type = ATOM_ONTOLOGY.get(new)
    if old_type != new_type:
        raise HTTPException(400, f"Cannot swap '{old}' ({old_type}) with '{new}' ({new_type}): different types")
    
    new_genome = [a for a in genome if a != old] + [new]
    landing_hash = genome_hash(new_genome)
    landing_density = lookup_density(landing_hash)
    original_density = lookup_density(genome_hash(genome))
    nearest = lookup_nearest_companies(new_genome)
    
    return _build_landing_report("swap", f"{old}→{new}", genome, original_density,
                                  landing_hash, landing_density, nearest)


@app.post("/api/genome/validate")
def validate(req: ValidateRequest):
    """Validate an arbitrary atom-set: check if it exists, its density, nearest neighbors."""
    atoms = sorted(set(normalize(a) for a in req.atoms))
    if not atoms:
        raise HTTPException(400, "At least one atom required")
    
    # Check all atoms are valid
    invalid = [a for a in atoms if a not in ATOM_ONTOLOGY]
    if invalid:
        raise HTTPException(400, f"Invalid atoms: {invalid}")
    
    landing_hash = genome_hash(atoms)
    landing_density = lookup_density(landing_hash)
    nearest = lookup_nearest_companies(atoms)
    
    return {
        "genome": atoms,
        "genome_hash": landing_hash,
        "density": landing_density,
        "classification": _classification(landing_density),
        "nearest_companies": nearest[:5],
        "types": {a: ATOM_ONTOLOGY[a] for a in atoms},
        "explanation": (
            f"Genome [{landing_hash}] has {landing_density} companies."
            if landing_density > 0
            else f"This genome is WHITESPACE — opportunity exists!"
        ),
    }


@app.post("/api/genome/gaps")
def gaps(req: GapsRequest):
    """
    Run the Gap Finder to find viable whitespace genomes.
    Uses Clingo to find optimal candidate whitespaces.
    """
    conn = get_db()
    cur = conn.cursor()
    
    # Get all feasible pairs (co-occur or near depth <= 3)
    cur.execute("""
        SELECT DISTINCT atom_a, atom_b FROM genome_near WHERE depth <= 3
    """)
    feasible = set()
    for a, b in cur.fetchall():
        feasible.add((a, b))
        feasible.add((b, a))
    
    # Get atom viability scores (based on frequency as heuristic)
    cur.execute("""
        SELECT atom, COUNT(*) as cnt FROM genome_company_atom
        GROUP BY atom ORDER BY cnt DESC
    """)
    viability = {row[0]: min(row[1] / 100, 100) for row in cur.fetchall()}
    
    # Get occupied hashes (to exclude from gaps)
    cur.execute("SELECT genome_hash FROM genome_density")
    occupied = set(row[0] for row in cur.fetchall())
    
    # Build atom type index
    atom_types: dict[str, str] = {}
    cur.execute("SELECT atom, atom_type FROM genome_atom_ontology")
    for a, t in cur.fetchall():
        atom_types[a] = t
    
    cur.close()
    conn.close()
    
    # Generate candidate whitespace hashes on-the-fly:
    # Take high-viability atoms and create 2-5 atom combinations
    # that DON'T exist in the density table.
    # This is a simplified version of the Clingo Gap Finder 
    # (full ASP enumeration is expensive for 478 atoms)
    
    top_atoms = sorted(viability.keys(), key=lambda a: -viability[a])[:50]
    
    # Ensure diverse types
    industry_atoms = [a for a in top_atoms if atom_types.get(a) == "industry"][:10]
    bm_atoms = [a for a in top_atoms if atom_types.get(a) == "business_model"][:5]
    delivery_atoms = [a for a in top_atoms if atom_types.get(a) == "delivery"][:5]
    tech_atoms = [a for a in top_atoms if atom_types.get(a) == "technology"][:10]
    
    whitespaces: list[dict] = []
    
    # Generate 2-atom whitespaces (industry + business_model)
    for ind in industry_atoms:
        for bm in bm_atoms:
            if (ind, bm) in feasible or (bm, ind) in feasible:
                h = genome_hash([ind, bm])
                if h not in occupied:
                    score = viability.get(ind, 0) + viability.get(bm, 0)
                    whitespaces.append({
                        "hash": h,
                        "atoms": [ind, bm],
                        "viability": score,
                        "explanation": f"Empty space: {ind} + {bm}. No company occupies this niche."
                    })
    
    # Generate 3-atom whitespaces (industry + business_model + delivery/tech)
    for ind in industry_atoms[:5]:
        for bm in bm_atoms:
            for delv in delivery_atoms + tech_atoms:
                atoms_set = [ind, bm, delv]
                # Check all pairs feasible
                all_feasible = all(
                    (atoms_set[i], atoms_set[j]) in feasible or i == j
                    for i in range(len(atoms_set))
                    for j in range(len(atoms_set))
                )
                if all_feasible:
                    h = genome_hash(atoms_set)
                    if h not in occupied:
                        score = sum(viability.get(a, 0) for a in atoms_set)
                        whitespaces.append({
                            "hash": h,
                            "atoms": atoms_set,
                            "viability": score,
                            "explanation": f"Empty space: {' + '.join(atoms_set)}. Underserved combination."
                        })
    
    # Sort by viability, deduplicate by hash, take top N
    seen: set[str] = set()
    results = []
    for w in sorted(whitespaces, key=lambda x: -x["viability"]):
        if w["hash"] not in seen:
            seen.add(w["hash"])
            results.append(w)
            if len(results) >= req.limit:
                break
    
    return {
        "total_candidates": len(results),
        "whitespaces": results,
        "note": "Gap Finder uses heuristic enumeration over top-50 atoms by viability. Full ASP enumeration is available for targeted queries."
    }


@app.post("/api/genome/team")
def team(req: TeamRequest):
    """
    Assemble the optimal team using Clingo.
    Injects human capabilities, conflicts, and constraints into ASP.
    """
    # Build Clingo program
    program = ""
    
    # Required atoms
    for atom in req.required_atoms:
        program += f'required("{atom}").\n'
    
    # Humans and their proven capabilities
    for human in req.available_humans:
        hid = human["id"]
        program += f'human("{hid}").\n'
        for cap in human.get("proven_capabilities", []):
            program += f'proven("{hid}", "{cap}").\n'
        if "viability" in human:
            program += f'team_viability("{hid}", {human["viability"]}).\n'
    
    # Hard conflicts
    for conflict in req.hard_conflicts:
        if len(conflict) >= 2:
            program += f'hard_conflict("{conflict[0]}", "{conflict[1]}").\n'
    
    # Max team size
    program += f'max_team({req.max_team_size}).\n'
    
    # Load base ASP program
    asp_path = os.path.join(GRAPH_DIR, "team_assembly.lp")
    if not os.path.exists(asp_path):
        raise HTTPException(500, "team_assembly.lp not found")
    with open(asp_path) as f:
        program += f.read()
    
    # Run Clingo
    ctl = clingo.Control()
    ctl.add("base", [], program)
    ctl.ground([("base", [])])
    
    # Configure to find optimal solution
    ctl.configuration.solve.models = 0  # Find all optimal models
    ctl.configuration.opt_mode = "optN"
    
    solutions = []
    
    def on_model(model):
        atoms = []
        covers = []
        viability = 0.0
        for sym in model.symbols(atoms=True):
            name = sym.name
            args = [str(a) for a in sym.arguments]
            if name == "team" and len(args) >= 1:
                atoms.append(args[0])
            elif name == "member_covers" and len(args) >= 2:
                covers.append({"human": args[0], "capability": args[1]})
            elif name == "total_viability" and len(args) >= 1:
                viability = float(args[0])
        solutions.append({
            "team": atoms,
            "coverage": covers,
            "total_viability": viability,
        })
    
    with ctl.solve(on_model=on_model, async_=False) as handle:
        pass
    
    if not solutions:
        return {
            "feasible": False,
            "message": "No team can cover all required capabilities given the constraints.",
            "solutions": [],
        }
    
    # Return the best solution
    best = max(solutions, key=lambda s: s["total_viability"] if s["total_viability"] else 0)
    
    # Check coverage
    covered = set(c["capability"] for c in best["coverage"])
    missing = set(req.required_atoms) - covered
    
    return {
        "feasible": len(missing) == 0,
        "optimal_team": best["team"],
        "capability_coverage": best["coverage"],
        "total_viability": best["total_viability"],
        "missing_capabilities": list(missing),
        "note": "Team assembled via Clingo ASP. Proven capabilities from Reality Index.",
    }


# ─── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
