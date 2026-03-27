-- CreateEnum
CREATE TYPE "IntersectionStatus" AS ENUM ('OPERATIONAL', 'OPTIMIZED', 'DEGRADED', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('APPLIED', 'REVERTED');

-- CreateTable
CREATE TABLE "Intersection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "status" "IntersectionStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intersection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficLog" (
    "id" SERIAL NOT NULL,
    "intersectionId" INTEGER NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "congestionLevel" DOUBLE PRECISION NOT NULL,
    "avgWaitTime" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationLog" (
    "id" SERIAL NOT NULL,
    "intersectionId" INTEGER NOT NULL,
    "trafficLogId" INTEGER,
    "action" TEXT NOT NULL,
    "previousWaitTime" INTEGER NOT NULL,
    "optimizedWaitTime" INTEGER NOT NULL,
    "congestionLevel" DOUBLE PRECISION NOT NULL,
    "status" "OptimizationStatus" NOT NULL DEFAULT 'APPLIED',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Intersection_name_key" ON "Intersection"("name");

-- CreateIndex
CREATE INDEX "Intersection_status_idx" ON "Intersection"("status");

-- CreateIndex
CREATE INDEX "TrafficLog_intersectionId_timestamp_idx" ON "TrafficLog"("intersectionId", "timestamp");

-- CreateIndex
CREATE INDEX "TrafficLog_timestamp_idx" ON "TrafficLog"("timestamp");

-- CreateIndex
CREATE INDEX "TrafficLog_congestionLevel_timestamp_idx" ON "TrafficLog"("congestionLevel", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationLog_trafficLogId_key" ON "OptimizationLog"("trafficLogId");

-- CreateIndex
CREATE INDEX "OptimizationLog_intersectionId_timestamp_idx" ON "OptimizationLog"("intersectionId", "timestamp");

-- CreateIndex
CREATE INDEX "OptimizationLog_timestamp_idx" ON "OptimizationLog"("timestamp");

-- AddForeignKey
ALTER TABLE "TrafficLog" ADD CONSTRAINT "TrafficLog_intersectionId_fkey" FOREIGN KEY ("intersectionId") REFERENCES "Intersection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationLog" ADD CONSTRAINT "OptimizationLog_intersectionId_fkey" FOREIGN KEY ("intersectionId") REFERENCES "Intersection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptimizationLog" ADD CONSTRAINT "OptimizationLog_trafficLogId_fkey" FOREIGN KEY ("trafficLogId") REFERENCES "TrafficLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
