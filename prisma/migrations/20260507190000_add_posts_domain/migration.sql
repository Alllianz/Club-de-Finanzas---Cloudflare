CREATE TYPE "PostType" AS ENUM ('REPORT', 'NEWSLETTER', 'EVENT');
CREATE TYPE "PostSection" AS ENUM ('HOME', 'PORTFOLIO', 'RESEARCH', 'NEWSLETTER', 'INSTITUTIONAL');
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "AssetKind" AS ENUM ('PDF', 'IMAGE', 'FLYER');
CREATE TYPE "ContactLinkKind" AS ENUM ('LINKEDIN', 'INSTAGRAM', 'X', 'EMAIL', 'WHATSAPP', 'YOUTUBE', 'LOCATION', 'OTHER');

CREATE TABLE "Post" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "type" "PostType" NOT NULL,
  "section" "PostSection" NOT NULL,
  "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "featuredOrder" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PostAsset" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "kind" "AssetKind" NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PostAuthor" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "teamMemberId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PostAuthor_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostAuthor_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PostAuthor_postId_teamMemberId_key" UNIQUE ("postId", "teamMemberId")
);

CREATE TABLE "EventMeta" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL UNIQUE,
  "eventDate" TIMESTAMP(3) NOT NULL,
  "registrationUrl" TEXT,
  "pinUntil" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventMeta_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Sponsor" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "logoUrl" TEXT,
  "linkUrl" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Resource" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ContactLink" (
  "id" TEXT PRIMARY KEY,
  "kind" "ContactLinkKind" NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT,
  "href" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Post_section_status_publishedAt_idx" ON "Post"("section", "status", "publishedAt");
CREATE INDEX "Post_type_status_publishedAt_idx" ON "Post"("type", "status", "publishedAt");
CREATE INDEX "PostAsset_postId_sortOrder_idx" ON "PostAsset"("postId", "sortOrder");
CREATE INDEX "PostAuthor_postId_sortOrder_idx" ON "PostAuthor"("postId", "sortOrder");
CREATE INDEX "Sponsor_isActive_sortOrder_idx" ON "Sponsor"("isActive", "sortOrder");
CREATE INDEX "Resource_isActive_sortOrder_idx" ON "Resource"("isActive", "sortOrder");
CREATE INDEX "ContactLink_isActive_sortOrder_idx" ON "ContactLink"("isActive", "sortOrder");
