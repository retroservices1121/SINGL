// SPREDD Oracle cron worker.
//
// A tiny always-on Node service (no dependencies — Node 22 has global fetch)
// that triggers the Oracle cron endpoints on schedule. Deploy as its own
// Railway service so it's a single instance, isolated from the web app.
//
// Env:
//   CRON_SECRET  (required) — must match the web app's CRON_SECRET
//   BASE_URL     (optional) — defaults to https://singl.market
//
// Schedules:
//   /api/cron/oracle-settle   — every 20 min (grade finished matches, award points)
//   /api/cron/oracle-rewards  — once daily at 09:00 UTC (~05:00 ET): streaks + pools

const BASE = (process.env.BASE_URL || 'https://singl.market').replace(/\/$/, '');
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error('[cron] CRON_SECRET is not set — exiting.');
  process.exit(1);
}

async function hit(path) {
  const url = `${BASE}${path}?secret=${encodeURIComponent(SECRET)}`;
  const stamp = new Date().toISOString();
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${SECRET}` } });
    const body = (await res.text()).slice(0, 300);
    console.log(`[cron] ${stamp} ${path} -> ${res.status} ${body}`);
  } catch (err) {
    console.error(`[cron] ${stamp} ${path} -> ERROR ${err.message}`);
  }
}

// ── Settle: every 20 minutes (plus once on boot) ──
const SETTLE_MS = 20 * 60 * 1000;
hit('/api/cron/oracle-settle');
setInterval(() => hit('/api/cron/oracle-settle'), SETTLE_MS);

// ── Rewards: once per day at 09:00 UTC ──
// Poll every 5 min; fire when we enter the 09:00 UTC hour and haven't run today.
// The endpoint itself is idempotent per day, so a duplicate is harmless.
let lastRewardsDay = null;
setInterval(() => {
  const now = new Date();
  const day = now.toISOString().split('T')[0];
  if (now.getUTCHours() === 9 && lastRewardsDay !== day) {
    lastRewardsDay = day;
    hit('/api/cron/oracle-rewards');
  }
}, 5 * 60 * 1000);

console.log(`[cron] SPREDD Oracle cron worker started. Target: ${BASE}`);
console.log('[cron] settle: every 20m · rewards: daily 09:00 UTC');
