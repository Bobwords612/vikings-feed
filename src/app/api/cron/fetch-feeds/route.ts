import { NextRequest, NextResponse } from 'next/server';
import { fetchAllFeeds } from '@/lib/feedFetcher';

export async function GET(req: NextRequest) {
  // Simple auth for cron - check for secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await fetchAllFeeds();

  return NextResponse.json({
    success: true,
    newArticles: result.total,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  });
}

// POST handler for dev/manual feed triggering (no auth required)
export async function POST() {
  const result = await fetchAllFeeds();

  return NextResponse.json({
    success: true,
    newArticles: result.total,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  });
}
