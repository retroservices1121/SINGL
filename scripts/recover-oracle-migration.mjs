// One-shot startup recovery: clears the failed `20260608_oracle_claims`
// migration record that blocks `prisma migrate deploy` (P3009).
//
// Background: the Oracle migrations originally applied in the wrong order
// (claims before the table-creating migration), so `20260608_oracle_claims`
// failed mid-apply and Prisma recorded it as failed. The migration was renamed
// to `20260608_spredd_oracle_claims` to fix the ordering, but the failed record
// from the old name still blocks all future migrations until removed.
//
// This is safe and idempotent:
//   - It only deletes the row WHERE finished_at IS NULL (a failed/incomplete
//     migration that applied nothing — its first statement errored inside a
//     transaction, so no schema changed).
//   - After the corrected migrations apply, the record is named
//     `20260608_spredd_oracle_claims`, so this DELETE never matches again.
//   - On a brand-new DB (no _prisma_migrations table yet) it no-ops.
//
// Once a successful deploy has happened, this step can be removed from the
// Docker CMD — leaving it in is harmless.

import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('[recover] No DATABASE_URL set — skipping migration recovery.');
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url });
try {
  const res = await pool.query(
    `DELETE FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NULL`,
    ['20260608_oracle_claims']
  );
  console.log(`[recover] Cleared ${res.rowCount} stale failed migration record(s) for 20260608_oracle_claims.`);
} catch (err) {
  // Brand-new DB (table absent) or a transient error — never block startup.
  console.log('[recover] Nothing to recover:', err.message);
} finally {
  await pool.end();
}
process.exit(0);
