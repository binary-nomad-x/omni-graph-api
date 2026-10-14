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
  CREATE TABLE IF NOT EXISTS "posts" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT false,
      "authorId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "posts_authorId_idx" ON "posts"("authorId");
  CREATE INDEX IF NOT EXISTS "posts_published_idx" ON "posts"("published");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_authorId_fkey') THEN
      ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint posts_authorId_fkey on posts';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
