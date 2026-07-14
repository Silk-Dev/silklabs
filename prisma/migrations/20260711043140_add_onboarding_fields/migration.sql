-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "commitment" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "lookingFor" TEXT,
ADD COLUMN     "motivation" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partnerships" TEXT,
ADD COLUMN     "skills" JSONB,
ADD COLUMN     "tldr" TEXT,
ADD COLUMN     "topSkill" TEXT,
ADD COLUMN     "visibleRegions" TEXT[];
