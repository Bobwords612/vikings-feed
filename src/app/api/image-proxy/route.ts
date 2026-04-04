import { NextRequest, NextResponse } from 'next/server';

// Proxy images to avoid CORS and hotlink protection issues
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VikingsFeed/1.0',
        'Accept': 'image/*',
        'Referer': new URL(url).origin,
      },
    });

    if (!response.ok || !response.headers.get('content-type')?.startsWith('image')) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
