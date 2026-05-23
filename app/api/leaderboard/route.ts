import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Leaderboard is temporarily empty after the AGG cutover. The previous version
// aggregated from the dropped Position table; the planned replacement is an
// AGG webhook (recipes/webhooks/event-reference) feeding a slim Trade event
// log. See the migration plan, Risks #1, for the follow-up.
export async function GET() {
  return NextResponse.json({ leaders: [] });
}
