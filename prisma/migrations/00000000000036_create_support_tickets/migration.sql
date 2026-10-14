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
  CREATE TABLE IF NOT EXISTS "support_tickets" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
      "category" TEXT NOT NULL DEFAULT 'general',
      "assignedToId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON "support_tickets"("userId");
  CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
  CREATE INDEX IF NOT EXISTS "support_tickets_priority_idx" ON "support_tickets"("priority");
  CREATE INDEX IF NOT EXISTS "support_tickets_assignedToId_idx" ON "support_tickets"("assignedToId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_userId_fkey') THEN
      ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint support_tickets_userId_fkey on support_tickets';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_assignedToId_fkey') THEN
      ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint support_tickets_assignedToId_fkey on support_tickets';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
