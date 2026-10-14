BEGIN;

DO $$

BEGIN

  CREATE TABLE IF NOT EXISTS "conversations" (
      "id" TEXT NOT NULL,
      "title" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
