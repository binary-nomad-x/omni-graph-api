BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('users')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "plan" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3),
      "autoRenew" BOOLEAN NOT NULL DEFAULT true,
      "cancelledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx" ON "subscriptions"("userId");
  CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_userId_fkey') THEN
      ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint subscriptions_userId_fkey on subscriptions';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
