BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('order_items'), ('users')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "return_requests" (
      "id" TEXT NOT NULL,
      "orderItemId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "resolvedAt" TIMESTAMP(3),
      CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "return_requests_orderItemId_idx" ON "return_requests"("orderItemId");
  CREATE INDEX IF NOT EXISTS "return_requests_userId_idx" ON "return_requests"("userId");
  CREATE INDEX IF NOT EXISTS "return_requests_status_idx" ON "return_requests"("status");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_orderItemId_fkey') THEN
      ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint return_requests_orderItemId_fkey on return_requests';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_requests_userId_fkey') THEN
      ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint return_requests_userId_fkey on return_requests';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
