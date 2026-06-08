// SPREDD Oracle cron worker.
//
// A tiny always-on Node service (no deps — Node 22 has global fetch) that
// triggers the Oracle cron endpoints on schedule. Deploy as its own Railway
// service so it's a single instance, isolated from the web app.
//
// Env:
//   CRON_SECRET  (required) — must match the web app's CRON_SECRET
//   BASE_URL     (optional) — defaults to https://singl.market
//   PORT         (set by Railway) — the health server binds here
//
// Schedules:
//   /api/cron/oracle-settle   — every 20 min (grade finished matches, award points)
//   /api/cron/oracle-rewards  — once daily at 09:00 UTC (~05:00 ET): streaks + pools

import http from 'node:http';

const BASE = (process.env.BASE_URL || 'https://singl.market').replace(/\/$/, '');
const SECRET = process.env.CRON_SECRET;
const PORT = process.env.PORT || 3000;

let lastSettle = null;
let lastRewards = null;

// Minimal health server so Railway's healthcheck (GET /api/health) passes — the
// worker has no UI of its own. Reports whether the secret is configured.
http
  .createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, cronSecretConfigured: !!SECRET, target: BASE, lastSettle, lastRewards }));
  })
  .listen(PORT, () => console.log(`[cron] health server listening on :${PORT}`));

async function hit(path) {
  const url = `${BASE}${path}?secret=${encodeURIComponent(SECRET)}`;
  const stamp = new Date().toISOString();
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${SECRET}` } });
    const body = (await res.text()).slice(0, 300);
    console.log(`[cron] ${stamp} ${path} -> ${res.status} ${body}`);
    const rec = { at: stamp, status: res.status };
    if (path.includes('settle')) lastSettle = rec;
    else lastRewards = rec;
  } catch (err) {
    console.error(`[cron] ${stamp} ${path} -> ERROR ${err.message}`);
  }
}

if (!SECRET) {
  // Stay up (so the deploy is healthy) but do nothing — loudly — until configured.
  console.error('[cron] CRON_SECRET is NOT set — jobs are DISABLED.');
  console.error('[cron] Add CRON_SECRET (same value as the web app) to this service and redeploy.');
} else {
  // Settle: every 20 minutes (plus once on boot).
  hit('/api/cron/oracle-settle');
  setInterval(() => hit('/api/cron/oracle-settle'), 20 * 60 * 1000);

  // Rewards: once per day at 09:00 UTC. Poll every 5 min; fire on entering the
  // 09:00 hour, once per day. The endpoint is idempotent so a dup is harmless.
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
}
