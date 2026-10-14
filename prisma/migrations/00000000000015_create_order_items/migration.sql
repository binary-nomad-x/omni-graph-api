BEGIN;

DO $$
DECLARE
  missing TEXT;

BEGIN
  SELECT t INTO missing
    FROM (VALUES ('orders'), ('products')) AS x(t)
    WHERE NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
    LIMIT 1;
  
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Migration skipped because prerequisite table % does not exist; run in order.', missing;
      RETURN;
    END IF;
  CREATE TABLE IF NOT EXISTS "order_items" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPrice" DOUBLE PRECISION NOT NULL,
      CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
  CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_orderId_fkey') THEN
      ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint order_items_orderId_fkey on order_items';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_productId_fkey') THEN
      ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ELSE
      RAISE NOTICE 'Skipping existing constraint order_items_productId_fkey on order_items';
    END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration adjustment: %', SQLERRM;
END $$;

COMMIT;
