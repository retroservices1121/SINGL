export async function register() {
  // Only run cron in the Node.js server runtime, not edge or build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET) {
      console.log('[cron] No CRON_SECRET set, skipping auto-refresh');
      return;
    }

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    const jobs = [
      { name: 'prices',  endpoint: '/api/cron/prices',  intervalMs: 5 * 60 * 1000 },   // every 5 min
      { name: 'news',    endpoint: '/api/cron/news',    intervalMs: 30 * 60 * 1000 },   // every 30 min
      { name: 'youtube', endpoint: '/api/cron/youtube', intervalMs: 60 * 60 * 1000 },   // every 1 hour
      { name: 'twitter',   endpoint: '/api/cron/twitter',    intervalMs: 15 * 60 * 1000 },   // every 15 min
      { name: 'tiktok',    endpoint: '/api/cron/tiktok',     intervalMs: 60 * 60 * 1000 },   // every 1 hour
    ];

    // Wait 30s after startup before first run
    setTimeout(() => {
      for (const job of jobs) {
        const run = async () => {
          try {
            const res = await fetch(`${BASE_URL}${job.endpoint}?secret=${encodeURIComponent(CRON_SECRET)}`);
            const data = await res.json();
            console.log(`[cron] ${job.name}:`, res.ok ? 'OK' : 'FAIL', JSON.stringify(data).slice(0, 150));
          } catch (err) {
            console.error(`[cron] ${job.name} error:`, err instanceof Error ? err.message : err);
          }
        };

        // Run immediately, then on interval
        run();
        setInterval(run, job.intervalMs);
        console.log(`[cron] Scheduled ${job.name} every ${job.intervalMs / 60000}min`);
      }
    }, 30_000);
  }
}
