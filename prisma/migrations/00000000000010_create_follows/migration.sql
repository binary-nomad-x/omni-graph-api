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
  CREATE TABLE IF NOT EXISTS "follows" (
      "id" TEXT NOT NULL,
      "followerId" TEXT NOT NULL,
      "followingId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "follows_followerId_idx" ON "follows"("followerId");
  CREATE INDEX IF NOT EXISTS "follows_followingId_idx" ON "follows"("followingId");
  CREATE UNIQUE INDEX IF NOT EXISTS "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_followerId_fkey') THEN
      ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint follows_followerId_fkey on follows';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_followingId_fkey') THEN
      ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint follows_followingId_fkey on follows';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
