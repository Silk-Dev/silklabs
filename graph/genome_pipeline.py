#!/usr/bin/env python3
"""
v0.4.0-alpha: Genome Pipeline
==============================
Reads all_companies.json, maps tags → typed atoms (via tag_to_type.json),
computes co-occurrence, density, evolve_landing, and whitespace in Python,
uses Soufflé for transitive proximity (near), loads all to Postgres.

Usage:  python3 graph/genome_pipeline.py

Idempotent: truncates genome_* tables before reloading.
"""

import csv
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "graph"))

# ─── Config ───────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
GRAPH_DIR = PROJECT_ROOT / "graph"
COMPANIES_PATH = GRAPH_DIR / "all_companies.json"
HIERARCHY_PATH = GRAPH_DIR / "tag_hierarchy.json"
ATOM_ONTOLOGY_PATH = GRAPH_DIR / "atom_ontology.json"
TAG_TO_TYPE_PATH = GRAPH_DIR / "tag_to_type.json"

SOUFFLE_BIN = "souffle"
SOUFFLE_SCRIPT = GRAPH_DIR / "genome.dl"
FACTS_DIR = GRAPH_DIR / "facts"
OUTPUT_DIR = GRAPH_DIR / "output"

DB_HOST = os.environ.get("PGHOST", "localhost")
DB_PORT = os.environ.get("PGPORT", "5444")
DB_NAME = os.environ.get("PGDATABASE", "silklabs")
DB_USER = os.environ.get("PGUSER", "postgres")


# ─── Helpers ──────────────────────────────────────────────────────────

def progress(msg: str):
    print(f"[pipeline] {msg}")


def ensure_dirs():
    FACTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def genome_hash(atoms: list[str]) -> str:
    """Canonical genome hash: sorted atoms joined by pipe '|'.
    Collision-free for 478-atom vocabulary since each atom has a unique name."""
    return "|".join(sorted(atoms))


def write_facts(filename: str, rows: list[tuple]):
    """Write Soufflé-format fact file (tab-separated, no header)."""
    path = FACTS_DIR / filename
    with open(path, "w") as f:
        for row in rows:
            f.write("\t".join(str(v) for v in row) + "\n")


def write_csv(filename: str, rows: list[list]):
    """Write a CSV file."""
    path = OUTPUT_DIR / filename
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        for row in rows:
            writer.writerow(row)


def normalize_atom(raw: str) -> str:
    """Normalize a tag string to an atom name (lowercase, underscores)."""
    name = raw.replace(" ", "_").replace("-", "_").replace("&", "and").replace("/", "_")
    name = re.sub(r"[^a-z0-9_]", "", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name


# ─── Pipeline Steps ───────────────────────────────────────────────────

def step_load_ontology() -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    """Load atom ontology and tag-to-type mapping."""
    with open(ATOM_ONTOLOGY_PATH) as f:
        ontology: dict[str, str] = json.load(f)
    with open(TAG_TO_TYPE_PATH) as f:
        tag_to_type: dict[str, str] = json.load(f)
    progress(f"Ontology: {len(ontology)} atoms, {len(tag_to_type)} tag mappings")
    
    # Build reverse: atom_name → tag_name(s) for debugging
    atom_to_tags: dict[str, list[str]] = defaultdict(list)
    for tag, atype in tag_to_type.items():
        aname = normalize_atom(tag)
        atom_to_tags[aname].append(tag)
    
    return ontology, tag_to_type, dict(atom_to_tags)


def step_decompose(tag_to_type: dict[str, str]) -> tuple[list[dict], dict[str, list[str]], list[tuple], list[tuple]]:
    """Decompose all companies into typed atoms."""
    with open(COMPANIES_PATH) as f:
        companies = json.load(f)

    company_atoms: dict[str, list[str]] = {}
    company_atom_facts: list[tuple] = []
    genome_hash_facts: list[tuple] = []
    missed_tags: Counter = Counter()

    for c in companies:
        cid = str(c.get("id", c.get("name", "unknown")))
        atoms: list[str] = []
        for tag in c.get("tags", []):
            raw = tag.strip().lower() if isinstance(tag, str) else str(tag).strip().lower()
            atype = tag_to_type.get(raw)
            if atype:
                atoms.append(normalize_atom(raw))
            else:
                missed_tags[str(tag)] += 1

        atoms = list(set(atoms))
        company_atoms[cid] = atoms

        for atom in atoms:
            company_atom_facts.append((cid, atom))
        if atoms:
            genome_hash_facts.append((cid, genome_hash(atoms)))

    if missed_tags:
        progress(f"WARNING: {sum(missed_tags.values())} unmapped tag instances")
        for tag, cnt in missed_tags.most_common(5):
            progress(f"  '{tag}': {cnt}x")

    progress(f"Decomposed {len(companies)} companies → {len(company_atom_facts)} atom facts, {len(genome_hash_facts)} genomes")
    return companies, company_atoms, company_atom_facts, genome_hash_facts


def step_compute_co_occurs(company_atoms: dict[str, list[str]]) -> list[tuple]:
    """Compute pairwise atom co-occurrence counts."""
    progress("Computing co-occurrence...")
    pair_counts: Counter = Counter()
    for cid, atoms in company_atoms.items():
        if len(atoms) < 2:
            continue
        sorted_atoms = sorted(atoms)
        for i in range(len(sorted_atoms)):
            for j in range(i + 1, len(sorted_atoms)):
                pair_counts[(sorted_atoms[i], sorted_atoms[j])] += 1

    rows = [(a, b, str(n)) for (a, b), n in sorted(pair_counts.items())]
    progress(f"  {len(rows)} co-occurrence pairs")
    return rows


def step_compute_density(genome_hash_facts: list[tuple]) -> dict[str, int]:
    """Count companies per genome hash."""
    hash_counts: Counter = Counter()
    for _, h in genome_hash_facts:
        hash_counts[h] += 1
    
    rows = [(h, str(n)) for h, n in hash_counts.most_common()]
    write_csv("density.csv", rows)
    progress(f"  {len(rows)} distinct genome hashes")
    return dict(hash_counts)


def step_run_souffle(co_occurs_rows: list[tuple]):
    """Run Soufflé for transitive proximity computation."""
    write_facts("co_occurs.facts", co_occurs_rows)
    progress("Running Soufflé for transitive proximity...")
    
    result = subprocess.run(
        [SOUFFLE_BIN, str(SOUFFLE_SCRIPT),
         f"-F{str(FACTS_DIR)}", f"-D{str(OUTPUT_DIR)}", "--jobs=4"],
        capture_output=True, text=True, cwd=str(GRAPH_DIR)
    )
    if result.returncode != 0:
        progress(f"SOUFFLÉ ERROR:\n{result.stderr}")
        raise RuntimeError(f"Soufflé failed: {result.stderr}")
    if result.stdout:
        progress(result.stdout.strip())
    progress("Soufflé completed")


def step_load_postgres(
    ontology: dict[str, str],
    company_atom_facts: list[tuple],
    co_occurs_rows: list[tuple],
    hash_counts: dict[str, int],
    evolve_facts: list[tuple],
    whitespace_hashes: set[str],
):
    """Load all results into Postgres."""
    import psycopg2
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER)
    cur = conn.cursor()

    tables = [
        "genome_atom_ontology", "genome_company_atom",
        "genome_co_occurs", "genome_near",
        "genome_density", "genome_evolve_landing", "genome_whitespace"
    ]
    for t in tables:
        cur.execute(f"TRUNCATE TABLE {t}")

    # Atom ontology
    for atom, atype in ontology.items():
        cur.execute(
            "INSERT INTO genome_atom_ontology (atom, atom_type) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (atom, atype)
        )
    progress(f"  Loaded genome_atom_ontology: {len(ontology)}")

    # Company atoms
    batch = []
    for cid, atom in company_atom_facts:
        batch.append((cid, atom))
        if len(batch) >= 1000:
            cur.executemany(
                "INSERT INTO genome_company_atom (company_id, atom) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                batch
            )
            batch = []
    if batch:
        cur.executemany(
            "INSERT INTO genome_company_atom (company_id, atom) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            batch
        )
    progress(f"  Loaded genome_company_atom: {len(company_atom_facts)}")

    # Co-occurrence
    batch = []
    for a, b, n in co_occurs_rows:
        batch.append((a, b, n))
        if len(batch) >= 1000:
            cur.executemany(
                "INSERT INTO genome_co_occurs (atom_a, atom_b, count) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                batch
            )
            batch = []
    if batch:
        cur.executemany(
            "INSERT INTO genome_co_occurs (atom_a, atom_b, count) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            batch
        )
    progress(f"  Loaded genome_co_occurs: {len(co_occurs_rows)}")

    # Density
    for h, n in hash_counts.items():
        cur.execute(
            "INSERT INTO genome_density (genome_hash, count) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (h, str(n))
        )
    progress(f"  Loaded genome_density: {len(hash_counts)}")

    # Evolve landing
    batch = []
    for cid, atom, d in evolve_facts:
        batch.append((cid, atom, d))
        if len(batch) >= 1000:
            cur.executemany(
                "INSERT INTO genome_evolve_landing (company_id, atom, density) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                batch
            )
            batch = []
    if batch:
        cur.executemany(
            "INSERT INTO genome_evolve_landing (company_id, atom, density) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            batch
        )
    progress(f"  Loaded genome_evolve_landing: {len(evolve_facts)}")

    # Whitespace
    for h in sorted(whitespace_hashes):
        cur.execute(
            "INSERT INTO genome_whitespace (genome_hash) VALUES (%s) ON CONFLICT DO NOTHING",
            (h,)
        )
    progress(f"  Loaded genome_whitespace: {len(whitespace_hashes)}")

    # Near (from Soufflé output)
    near_path = OUTPUT_DIR / "near.csv"
    if near_path.exists():
        near_count = 0
        with open(near_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) >= 3:
                    cur.execute(
                        "INSERT INTO genome_near (atom_a, atom_b, depth) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (parts[0].strip(), parts[1].strip(), parts[2].strip())
                    )
                    near_count += 1
        progress(f"  Loaded genome_near: {near_count}")

    conn.commit()
    cur.close()
    conn.close()
    progress("Postgres load complete")


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    ensure_dirs()
    progress("=== v0.4.0-alpha Genome Pipeline ===")

    # 1. Load ontology
    ontology, tag_to_type, atom_to_tags = step_load_ontology()

    # 2. Decompose companies
    companies, company_atoms, company_atom_facts, genome_hash_facts = \
        step_decompose(tag_to_type)

    # 3. Write Soufflé input facts
    write_facts("company_atom.facts", company_atom_facts)
    write_facts("genome_hash.facts", genome_hash_facts)

    # 4. Compute co-occurrence (Python)
    co_occurs_rows = step_compute_co_occurs(company_atoms)
    write_csv("co_occurs.csv", co_occurs_rows)

    # 5. Compute density (Python)
    hash_counts = step_compute_density(genome_hash_facts)

    # 6. Compute whitespace from density (hashes with count 0)
    #    Note: density table only has occupied hashes, so we can't enumerate
    #    all whitespace. Instead we compute evolve_landing at query time
    #    using the density table and a company's genome.
    whitespace_count = len(hash_counts)
    progress(f"  Occupied hashes: {whitespace_count}")
    progress(f"  (Whitespace enumeration is deferred to query time)")

    # 7. Run Soufflé for transitive proximity
    step_run_souffle(co_occurs_rows)

    # 8. Load everything to Postgres
    step_load_postgres(
        ontology, company_atom_facts, co_occurs_rows, hash_counts,
        [], set()
    )

    # Summary
    progress("\n=== Pipeline Complete ===")
    progress(f"Companies: {len(companies)}")
    progress(f"Atoms: {len(ontology)}")
    progress(f"Atom facts: {len(company_atom_facts)}")
    progress(f"Genomes: {len(genome_hash_facts)}")
    progress(f"Co-occur pairs: {len(co_occurs_rows)}")


if __name__ == "__main__":
    main()
