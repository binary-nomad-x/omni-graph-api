BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('payments'), ('orders')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "refunds" (
      "id" TEXT NOT NULL,
      "paymentId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "refunds_paymentId_idx" ON "refunds"("paymentId");
  CREATE INDEX IF NOT EXISTS "refunds_orderId_idx" ON "refunds"("orderId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_paymentId_fkey') THEN
      ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint refunds_paymentId_fkey on refunds';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refunds_orderId_fkey') THEN
      ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint refunds_orderId_fkey on refunds';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
