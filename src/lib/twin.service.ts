import { pipeline } from "@xenova/transformers"
import { prisma } from "@/lib/prisma"

// Cache the pipeline to avoid reloading the model on every invocation
let extractor: any = null

async function getExtractor() {
  if (!extractor) {
    // Force local execution — do not reach out to HuggingFace CDN in prod without caching
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  }
  return extractor
}

export async function buildTwin(ownerId: string, ownerType: "USER" | "PROJECT") {
  try {
    let corpus = ""
    let twinProfile: any = {}
    let preferences: any = {}

    if (ownerType === "USER") {
      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        include: { profile: true },
      })
      if (!user || !user.profile) throw new Error(`User or profile not found for ${ownerId}`)

      const p = user.profile
      // Explicitly construct the corpus. Do not use undefined values.
      corpus = [
        p.bio || "",
        p.location || "",
        (p.skills as string[])?.join(", ") || "",
        p.motivation || "",
        p.partnerships || "",
      ]
        .filter(Boolean)
        .join(" | ")

      twinProfile = {
        skills: p.skills || [],
        motivation: p.motivation || "",
        experience: p.experience || "",
        topSkill: p.topSkill || "",
      }

      preferences = {
        lookingFor: p.lookingFor || "",
        commitment: p.commitment || "",
        location: p.location || "",
      }
    } else if (ownerType === "PROJECT") {
      const project = await prisma.project.findUnique({
        where: { id: ownerId },
        include: { roles: { include: { tags: { include: { tag: true } } } } },
      })
      if (!project) throw new Error(`Project not found for ${ownerId}`)

      const roleNames = project.roles.map((r) => r.title).join(", ")
      const tagNames = project.roles
        .flatMap((r) => r.tags.map((t) => t.tag.name))
        .join(", ")

      corpus = [
        project.title || "",
        project.description || "",
        roleNames,
        tagNames,
      ]
        .filter(Boolean)
        .join(" | ")

      twinProfile = {
        title: project.title,
        description: project.description || "",
        phase: project.phase,
        roles: project.roles.map((r) => ({ title: r.title, isFilled: r.isFilled })),
      }

      preferences = {
        requiredSkills: tagNames,
      }
    }

    if (!corpus.trim()) {
      throw new Error(`Cannot build twin: Corpus is empty for ${ownerType} ${ownerId}`)
    }

    // Generate embedding
    const extract = await getExtractor()
    const output = await extract(corpus, { pooling: "mean", normalize: true })

    // Xenova returns a Tensor. Convert to standard JS array of numbers.
    const embeddingArray = Array.from(output.data) as number[]

    if (embeddingArray.length !== 384) {
      throw new Error(`Expected 384 dimensions, got ${embeddingArray.length}`)
    }

    const embeddingString = JSON.stringify(embeddingArray)

    // 1. Upsert the Prisma-managed fields (JSON, Strings, Dates)
    await prisma.twinVector.upsert({
      where: { ownerType_ownerId: { ownerType, ownerId } },
      update: {
        embedding: embeddingString,
        twinProfile,
        preferences,
        version: { increment: 1 },
        lastSyncedAt: new Date(),
      },
      create: {
        ownerType,
        ownerId,
        embedding: embeddingString,
        twinProfile,
        preferences,
        lastSyncedAt: new Date(),
      },
    })

    // 2. Update the raw vector column using $executeRaw
    // We format the array as a Postgres vector literal: '[0.1, 0.2, ...]'
    const vectorLiteral = `[${embeddingArray.join(",")}]`

    await prisma.$executeRawUnsafe(
      `UPDATE "twin_vectors" SET "embedding_vector" = $1::vector WHERE "ownerType" = $2 AND "ownerId" = $3`,
      vectorLiteral,
      ownerType,
      ownerId,
    )

    return { success: true, ownerId, ownerType, dimensions: embeddingArray.length }
  } catch (error) {
    console.error(`[TwinService] CRITICAL FAILURE building twin for ${ownerType}:${ownerId}`, error)
    throw error // Do not swallow errors. The caller must know this failed.
  }
}
