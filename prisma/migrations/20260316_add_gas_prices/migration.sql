-- CreateTable
CREATE TABLE "GasPrice" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GasPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GasPrice_eventId_region_grade_idx" ON "GasPrice"("eventId", "region", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "GasPrice_eventId_region_grade_weekOf_key" ON "GasPrice"("eventId", "region", "grade", "weekOf");

-- AddForeignKey
ALTER TABLE "GasPrice" ADD CONSTRAINT "GasPrice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
