BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('users'), ('posts')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "comments" (
      "id" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "postId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId");
  CREATE INDEX IF NOT EXISTS "comments_postId_idx" ON "comments"("postId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_authorId_fkey') THEN
      ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint comments_authorId_fkey on comments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_postId_fkey') THEN
      ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint comments_postId_fkey on comments';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
