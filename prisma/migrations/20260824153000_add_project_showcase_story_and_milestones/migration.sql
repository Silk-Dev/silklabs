-- AlterTable: campaign story rich-text fields
ALTER TABLE "projects" ADD COLUMN "whatWeAre" TEXT,
ADD COLUMN "whatWereBuilding" TEXT;

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('Done', 'Current', 'Upcoming');

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'Upcoming',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "project_milestones_projectId_position_idx" ON "project_milestones"("projectId", "position");
