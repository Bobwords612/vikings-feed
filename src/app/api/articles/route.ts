import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50);
  const sourceId = searchParams.get('source');

  const where: Record<string, unknown> = {};
  if (sourceId) where.sourceId = parseInt(sourceId);
  if (cursor) where.id = { lt: parseInt(cursor) };

  const articles = await prisma.article.findMany({
    where,
    include: {
      source: {
        select: { id: true, name: true, url: true, logoUrl: true, allowsIframe: true },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  const nextCursor = articles.length === limit ? articles[articles.length - 1].id : null;

  return NextResponse.json({
    articles,
    nextCursor,
  });
}
