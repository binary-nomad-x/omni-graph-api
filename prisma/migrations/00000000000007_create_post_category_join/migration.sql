BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('categories'), ('posts')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "_PostToCategory" (
      "A" TEXT NOT NULL,
      "B" TEXT NOT NULL,
      CONSTRAINT "_PostToCategory_AB_pkey" PRIMARY KEY ("A","B")
  );

  CREATE INDEX IF NOT EXISTS "_PostToCategory_B_index" ON "_PostToCategory"("B");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_PostToCategory_A_fkey') THEN
      ALTER TABLE "_PostToCategory" ADD CONSTRAINT "_PostToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint _PostToCategory_A_fkey on _PostToCategory';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_PostToCategory_B_fkey') THEN
      ALTER TABLE "_PostToCategory" ADD CONSTRAINT "_PostToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint _PostToCategory_B_fkey on _PostToCategory';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
