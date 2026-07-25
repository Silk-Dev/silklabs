-- Add ProofOfWork table and reality vector columns to twin_vectors
-- This migration is partially manual because Prisma doesn't manage vector columns.

-- Step 1: Add reality columns to twin_vectors (Prisma-managed)
ALTER TABLE "twin_vectors" ADD COLUMN IF NOT EXISTS "realityEmbedding" TEXT;
ALTER TABLE "twin_vectors" ADD COLUMN IF NOT EXISTS "realityScore" DOUBLE PRECISION;

-- Step 2: Create proofs_of_work table (matching Prisma conventions)
CREATE TABLE IF NOT EXISTS "proofs_of_work" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "embedding" TEXT,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "title" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proofs_of_work_pkey" PRIMARY KEY ("id")
);

-- Step 3: Add vector columns (managed via raw SQL)
ALTER TABLE "proofs_of_work" ADD COLUMN IF NOT EXISTS "embedding_vector" vector(384);
ALTER TABLE "twin_vectors" ADD COLUMN IF NOT EXISTS "reality_vector" vector(384);

-- Step 4: Create IVFFlat indexes for ANN search
CREATE INDEX IF NOT EXISTS idx_proofs_of_work_embedding
  ON "proofs_of_work" USING ivfflat ("embedding_vector" vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_twin_vectors_reality
  ON "twin_vectors" USING ivfflat ("reality_vector" vector_cosine_ops) WITH (lists = 100);

-- Step 5: Index on (ownerType, ownerId) for polymorphic lookups
CREATE INDEX IF NOT EXISTS idx_proofs_of_work_owner
  ON "proofs_of_work"("ownerType", "ownerId");

