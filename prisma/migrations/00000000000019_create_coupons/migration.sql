BEGIN;

DO $$

BEGIN

  CREATE TABLE IF NOT EXISTS "coupons" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "description" TEXT,
      "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "minPurchase" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "maxUses" INTEGER NOT NULL DEFAULT 0,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "expiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
  CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons"("code");
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
