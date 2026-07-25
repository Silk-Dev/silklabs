-- Add unique constraint on alignments for bulk upsert support
-- Note: This migration deliberately does NOT drop embedding_vector from
-- twin_vectors. That column is managed via raw SQL ($executeRaw) and is
-- not tracked by Prisma's schema.
CREATE UNIQUE INDEX IF NOT EXISTS "alignments_userTwinId_matchTwinId_key" ON "alignments"("userTwinId", "matchTwinId");
