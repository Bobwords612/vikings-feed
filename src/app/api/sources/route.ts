import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const detail = searchParams.get('detail');

  if (detail === 'true') {
    const sources = await prisma.source.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        tier: true,
        logoUrl: true,
        _count: { select: { articles: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      sources.map((s) => ({
        id: s.id,
        name: s.name,
        tier: s.tier,
        logoUrl: s.logoUrl,
        articleCount: s._count.articles,
      }))
    );
  }

  const sources = await prisma.source.findMany({
    where: { isActive: true },
    select: { id: true, name: true, tier: true, logoUrl: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(sources);
}
