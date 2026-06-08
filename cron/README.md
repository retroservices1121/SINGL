# SPREDD Oracle cron worker

A standalone always-on worker that triggers the Oracle cron endpoints on
schedule. Deploy as its **own Railway service** in the same project as the app.

- `/api/cron/oracle-settle` — every 20 min (grade matches, award points)
- `/api/cron/oracle-rewards` — daily 09:00 UTC / ~05:00 ET (streaks + reward pools)

No dependencies — Node 22's global `fetch`. The image is `node:22-slim` + one file.

## Set it up in Railway (one-time, ~2 min)

1. In your existing Railway **project**, click **New → GitHub Repo** and pick the
   same `SINGL` repo.
2. In the new service's **Settings**:
   - **Root Directory:** `cron`
     (so Railway builds `cron/Dockerfile`, not the web app's Dockerfile)
   - Confirm **Builder** is Dockerfile.
3. In the new service's **Variables**, add:
   - `CRON_SECRET` — the **same value** as the web app's `CRON_SECRET`
     (tip: use a reference variable to the app service so they stay in sync)
   - `BASE_URL` — optional, defaults to `https://singl.market`
4. Deploy. Check the logs — you should see:
   ```
   [cron] SPREDD Oracle cron worker started. Target: https://singl.market
   [cron] ... /api/cron/oracle-settle -> 200 {"settled":0,...}
   ```

That's it. It runs continuously (idle most of the time) and self-recovers on
restart. To change cadence, edit `index.mjs`.

## Why a separate service (not Railway's native cron)?

Railway cron runs one schedule per service and is fiddly with image
entrypoints. This worker handles both schedules in a single tiny process, and a
200 on settle confirms end-to-end that points are being awarded.
