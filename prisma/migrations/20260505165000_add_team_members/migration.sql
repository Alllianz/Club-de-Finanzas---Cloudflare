-- CreateEnum
CREATE TYPE "TeamSection" AS ENUM ('LEADERSHIP', 'PORTFOLIO', 'RESEARCH', 'RRII');

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortBio" TEXT,
    "imageUrl" TEXT,
    "profileUrl" TEXT,
    "section" "TeamSection" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamMember_section_isActive_displayOrder_idx" ON "TeamMember"("section", "isActive", "displayOrder");
