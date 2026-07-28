-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ForumSort" AS ENUM ('hot', 'new', 'top');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable forum_posts
CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable forum_comments
CREATE TABLE "forum_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable forum_tags
CREATE TABLE "forum_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "forum_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable forum_post_tags
CREATE TABLE "forum_post_tags" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "forum_post_tags_pkey" PRIMARY KEY ("postId", "tagId")
);

-- CreateIndexes
CREATE INDEX "forum_posts_createdAt_idx" ON "forum_posts"("createdAt" DESC);
CREATE INDEX "forum_posts_upvotes_idx" ON "forum_posts"("upvotes" DESC);
CREATE INDEX "forum_posts_userId_idx" ON "forum_posts"("userId");

CREATE INDEX "forum_comments_postId_createdAt_idx" ON "forum_comments"("postId", "createdAt" ASC);
CREATE INDEX "forum_comments_userId_idx" ON "forum_comments"("userId");

CREATE UNIQUE INDEX "forum_tags_name_key" ON "forum_tags"("name");

-- AddForeignKeys
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "forum_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_post_tags" ADD CONSTRAINT "forum_post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_post_tags" ADD CONSTRAINT "forum_post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "forum_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
