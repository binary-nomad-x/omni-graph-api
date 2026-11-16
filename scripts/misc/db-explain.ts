/**
 * db:explain — Profile the top 10 slowest/queries and suggest missing indexes.
 *
 * Usage:
 *   npx tsx scripts/misc/db-explain.ts
 *   npm run db:explain
 *
 * Requires DATABASE_URL in .env.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOP_N = 10;

async function main(): Promise<void> {
  console.log(`\n🔍 Running EXPLAIN ANALYZE on the top ${TOP_N} slowest queries...\n`);

  // Gather the slowest queries from pg_stat_statements (requires the extension).
  const rows = await prisma.$queryRaw<
    Array<{
      queryid: bigint;
      query: string;
      calls: bigint;
      total_exec_time: number;
      mean_exec_time: number;
      rows: bigint;
    }>
  >`
    SELECT queryid, query, calls, total_exec_time, mean_exec_time, rows
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT ${TOP_N}
  `;

  if (rows.length === 0) {
    console.log("No queries found in pg_stat_statements. Is the extension enabled?");
    console.log("  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;");
    return;
  }

  for (const row of rows) {
    const query = row.query.replace(/\s+/g, " ").trim();
    console.log(`\n── Query (${row.calls} calls, avg ${row.mean_exec_time.toFixed(2)} ms) ──`);
    console.log(query.slice(0, 200) + (query.length > 200 ? "..." : ""));

    // Run EXPLAIN (not ANALYZE to avoid side-effects) and print the plan.
    const plan = await prisma.$queryRaw<Array<{ "EXPLAIN": string }>>`EXPLAIN ${row.query}`;
    for (const r of plan) {
      console.log("  ", r.EXPLAIN);
    }
  }

  // Suggest missing indexes based on sequential scans on large tables.
  console.log("\n\n── Suggested Missing Indexes ──\n");

  const seqScans = await prisma.$queryRaw<
    Array<{
      schemaname: string;
      relname: string;
      seq_scan: bigint;
      seq_tup_read: bigint;
      idx_scan: bigint;
    }>
  >`
    SELECT schemaname, relname, seq_scan, seq_tup_read, idx_scan
    FROM pg_stat_user_tables
    WHERE seq_scan > 0 AND seq_tup_read > 1000
    ORDER BY seq_tup_read DESC
    LIMIT 10
  `;

  for (const t of seqScans) {
    console.log(`Table: ${t.schemaname}.${t.relname}`);
    console.log(`  Sequential scans: ${t.seq_scan} (${t.seq_tup_read} rows read)`);
    console.log(`  Index scans: ${t.idx_scan}`);
    console.log(`  → Consider adding indexes on frequently filtered/joined columns.`);
  }
}

main()
  .catch((err) => {
    console.error("db:explain failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
