BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('products'), ('users')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "reviews" (
      "id" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "title" TEXT,
      "content" TEXT,
      "productId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "reviews_productId_idx" ON "reviews"("productId");
  CREATE INDEX IF NOT EXISTS "reviews_userId_idx" ON "reviews"("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "reviews_productId_userId_key" ON "reviews"("productId", "userId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_productId_fkey') THEN
      ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint reviews_productId_fkey on reviews';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_userId_fkey') THEN
      ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint reviews_userId_fkey on reviews';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
