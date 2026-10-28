-- CreateTable
CREATE TABLE "CountryRiskSnapshot" (
    "id" TEXT NOT NULL,
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ArgentinaDatos',
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryRiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryRiskPointDb" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "riskDate" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountryRiskPointDb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CountryRiskSnapshot_tradingDate_key" ON "CountryRiskSnapshot"("tradingDate");

-- CreateIndex
CREATE UNIQUE INDEX "CountryRiskPointDb_snapshotId_riskDate_key" ON "CountryRiskPointDb"("snapshotId", "riskDate");

-- CreateIndex
CREATE INDEX "CountryRiskPointDb_snapshotId_riskDate_idx" ON "CountryRiskPointDb"("snapshotId", "riskDate");

-- AddForeignKey
ALTER TABLE "CountryRiskPointDb" ADD CONSTRAINT "CountryRiskPointDb_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CountryRiskSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
