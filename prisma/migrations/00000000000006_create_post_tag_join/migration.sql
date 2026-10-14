BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('posts'), ('tags')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "_PostToTag" (
      "A" TEXT NOT NULL,
      "B" TEXT NOT NULL,
      CONSTRAINT "_PostToTag_AB_pkey" PRIMARY KEY ("A","B")
  );

  CREATE INDEX IF NOT EXISTS "_PostToTag_B_index" ON "_PostToTag"("B");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_PostToTag_A_fkey') THEN
      ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint _PostToTag_A_fkey on _PostToTag';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_PostToTag_B_fkey') THEN
      ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint _PostToTag_B_fkey on _PostToTag';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
