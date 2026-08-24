-- AlterTable: record when a user accepted the Terms of Service
ALTER TABLE "users" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
