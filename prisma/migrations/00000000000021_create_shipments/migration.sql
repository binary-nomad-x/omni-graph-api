BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('orders')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "shipments" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "carrier" TEXT NOT NULL,
      "trackingNumber" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "estimatedDelivery" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "shipments_orderId_idx" ON "shipments"("orderId");
  CREATE INDEX IF NOT EXISTS "shipments_trackingNumber_idx" ON "shipments"("trackingNumber");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_orderId_fkey') THEN
      ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint shipments_orderId_fkey on shipments';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
