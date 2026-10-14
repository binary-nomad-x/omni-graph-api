BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('coupons')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponId" TEXT;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_couponId_fkey') THEN
      ALTER TABLE "orders" ADD CONSTRAINT "orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint orders_couponId_fkey on orders';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
