-- v0.4.0-alpha: Genome Engine Schema
-- Created by the Soufflé batch pipeline.
-- These are analytical tables, NOT Prisma entities.
-- They are truncated and reloaded each pipeline run.

CREATE TABLE IF NOT EXISTS genome_atom_ontology (
    id SERIAL PRIMARY KEY,
    atom TEXT NOT NULL UNIQUE,
    atom_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS genome_company_atom (
    id SERIAL PRIMARY KEY,
    company_id TEXT NOT NULL,
    atom TEXT NOT NULL,
    UNIQUE(company_id, atom)
);
CREATE INDEX IF NOT EXISTS idx_genome_company_atom_company ON genome_company_atom(company_id);
CREATE INDEX IF NOT EXISTS idx_genome_company_atom_atom ON genome_company_atom(atom);

-- Soufflé outputs (truncated each pipeline run)
CREATE TABLE IF NOT EXISTS genome_co_occurs (
    atom_a TEXT NOT NULL,
    atom_b TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY(atom_a, atom_b)
);

CREATE TABLE IF NOT EXISTS genome_near (
    atom_a TEXT NOT NULL,
    atom_b TEXT NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY(atom_a, atom_b, depth)
);

CREATE TABLE IF NOT EXISTS genome_density (
    genome_hash TEXT NOT NULL PRIMARY KEY,
    count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS genome_evolve_landing (
    company_id TEXT NOT NULL,
    atom TEXT NOT NULL,
    density INTEGER NOT NULL,
    PRIMARY KEY(company_id, atom)
);

CREATE TABLE IF NOT EXISTS genome_whitespace (
    genome_hash TEXT NOT NULL PRIMARY KEY
);
