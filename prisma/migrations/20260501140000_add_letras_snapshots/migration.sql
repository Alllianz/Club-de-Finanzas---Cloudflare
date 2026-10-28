-- CreateTable
CREATE TABLE "LetrasSnapshot" (
    "id" TEXT NOT NULL,
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ArgentinaDatos',
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "curveA" DOUBLE PRECISION,
    "curveB" DOUBLE PRECISION,
    "curveC" DOUBLE PRECISION,

    CONSTRAINT "LetrasSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LetrasInstrumentPoint" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "dtmDays" INTEGER NOT NULL,
    "temPercent" DOUBLE PRECISION,
    "tnaPercent" DOUBLE PRECISION,
    "teaPercent" DOUBLE PRECISION,
    "vpv" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LetrasInstrumentPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LetrasSnapshot_tradingDate_key" ON "LetrasSnapshot"("tradingDate");

-- CreateIndex
CREATE UNIQUE INDEX "LetrasInstrumentPoint_snapshotId_ticker_key" ON "LetrasInstrumentPoint"("snapshotId", "ticker");

-- CreateIndex
CREATE INDEX "LetrasInstrumentPoint_snapshotId_dtmDays_idx" ON "LetrasInstrumentPoint"("snapshotId", "dtmDays");

-- AddForeignKey
ALTER TABLE "LetrasInstrumentPoint" ADD CONSTRAINT "LetrasInstrumentPoint_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "LetrasSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
