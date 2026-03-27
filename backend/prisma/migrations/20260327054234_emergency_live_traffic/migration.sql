-- CreateEnum
CREATE TYPE "EmergencyVehicleType" AS ENUM ('AMBULANCE', 'POLICE', 'FIRE');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignalActionType" AS ENUM ('GREEN_CORRIDOR', 'CLEAR_APPROACH', 'RESTORE_DEFAULT');

-- AlterTable
ALTER TABLE "TrafficLog" ADD COLUMN     "meta" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'simulated';

-- CreateTable
CREATE TABLE "EmergencyVehicle" (
    "id" TEXT NOT NULL,
    "type" "EmergencyVehicleType" NOT NULL,
    "currentLocation" JSONB NOT NULL,
    "destination" JSONB NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eta" INTEGER NOT NULL,
    "routeGeometry" JSONB NOT NULL,
    "routeSummary" JSONB,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastTrafficSource" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalControlLog" (
    "id" SERIAL NOT NULL,
    "intersectionId" INTEGER NOT NULL,
    "emergencyVehicleId" TEXT,
    "action" "SignalActionType" NOT NULL,
    "waitTimeOverride" INTEGER,
    "reason" TEXT NOT NULL,
    "congestionLevel" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SignalControlLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyVehicle_status_createdAt_idx" ON "EmergencyVehicle"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmergencyVehicle_type_status_idx" ON "EmergencyVehicle"("type", "status");

-- CreateIndex
CREATE INDEX "SignalControlLog_intersectionId_createdAt_idx" ON "SignalControlLog"("intersectionId", "createdAt");

-- CreateIndex
CREATE INDEX "SignalControlLog_emergencyVehicleId_createdAt_idx" ON "SignalControlLog"("emergencyVehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "SignalControlLog_action_createdAt_idx" ON "SignalControlLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "SignalControlLog" ADD CONSTRAINT "SignalControlLog_intersectionId_fkey" FOREIGN KEY ("intersectionId") REFERENCES "Intersection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalControlLog" ADD CONSTRAINT "SignalControlLog_emergencyVehicleId_fkey" FOREIGN KEY ("emergencyVehicleId") REFERENCES "EmergencyVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
