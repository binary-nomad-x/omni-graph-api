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
  CREATE TABLE IF NOT EXISTS "addresses" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "label" TEXT NOT NULL DEFAULT 'Home',
      "street" TEXT NOT NULL,
      "addressLine2" TEXT,
      "city" TEXT NOT NULL,
      "state" TEXT,
      "zip" TEXT NOT NULL,
      "country" TEXT NOT NULL DEFAULT 'US',
      "phone" TEXT,
      "deliveryInstructions" TEXT,
      "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isBilling" BOOLEAN NOT NULL DEFAULT false,
      "contactName" TEXT,
      "contactPhone" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "addresses_userId_idx" ON "addresses"("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "addresses_userId_label_key" ON "addresses"("userId", "label");

  ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
