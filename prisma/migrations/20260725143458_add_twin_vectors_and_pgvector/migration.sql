-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable — twin_vectors (embedding vector column added manually to bypass Prisma type limitations)
CREATE TABLE "twin_vectors" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "embedding" TEXT,
    "twinProfile" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twin_vectors_pkey" PRIMARY KEY ("id")
);

-- Add the vector column manually (Prisma cannot represent vector(384) natively)
ALTER TABLE "twin_vectors" ADD COLUMN IF NOT EXISTS "embedding_vector" vector(384);

-- Create IVFFlat index for approximate nearest neighbor search
-- lists = 100 is optimal for <100k rows
CREATE INDEX IF NOT EXISTS idx_twin_vectors_embedding ON "twin_vectors"
  USING ivfflat ("embedding_vector" vector_cosine_ops) WITH (lists = 100);

-- CreateTable
CREATE TABLE "alignments" (
    "id" TEXT NOT NULL,
    "userTwinId" TEXT NOT NULL,
    "matchTwinId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "skillScore" DOUBLE PRECISION NOT NULL,
    "valueScore" DOUBLE PRECISION NOT NULL,
    "constraintScore" DOUBLE PRECISION NOT NULL,
    "diversityBonus" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "report" TEXT,
    "userFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "twin_vectors_ownerType_idx" ON "twin_vectors"("ownerType");

-- CreateIndex
CREATE UNIQUE INDEX "twin_vectors_ownerType_ownerId_key" ON "twin_vectors"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "alignments_userTwinId_idx" ON "alignments"("userTwinId");

-- CreateIndex
CREATE INDEX "alignments_matchTwinId_idx" ON "alignments"("matchTwinId");

-- CreateIndex
CREATE INDEX "alignments_overallScore_idx" ON "alignments"("overallScore");
