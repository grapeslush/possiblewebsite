-- CreateEnum
CREATE TYPE "ShipmentTrackingStatus" AS ENUM ('UNKNOWN', 'LABEL_PURCHASED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION');

-- AlterTable
ALTER TABLE "Shipment"
  ADD COLUMN     "provider" TEXT,
  ADD COLUMN     "serviceLevel" TEXT,
  ADD COLUMN     "trackingUrl" TEXT,
  ADD COLUMN     "trackingSubscriptionId" TEXT,
  ADD COLUMN     "trackingStatus" "ShipmentTrackingStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN     "trackingStatusDetail" TEXT,
  ADD COLUMN     "trackingLastEventAt" TIMESTAMP(3),
  ADD COLUMN     "trackingLastCheckedAt" TIMESTAMP(3),
  ADD COLUMN     "trackingNextCheckAt" TIMESTAMP(3),
  ADD COLUMN     "labelUrl" TEXT,
  ADD COLUMN     "labelKey" TEXT,
  ADD COLUMN     "labelCost" DECIMAL(10, 2),
  ADD COLUMN     "labelCurrency" TEXT,
  ADD COLUMN     "labelPurchasedAt" TIMESTAMP(3);
