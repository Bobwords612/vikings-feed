import { fetchAllFeeds } from '../src/lib/feedFetcher';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Fetching feeds with improved image extraction...');
  const r = await fetchAllFeeds();
  console.log(`Fetched ${r.total} articles, ${r.errors.length} errors`);
  r.errors.forEach(e => console.log('  ERR:', e));

  const prisma = new PrismaClient();
  const total = await prisma.article.count();
  const withImage = await prisma.article.count({ where: { imageUrl: { not: null } } });
  console.log(`Total: ${total} | With images: ${withImage} | Without: ${total - withImage}`);

  const samples = await prisma.article.findMany({
    where: { imageUrl: { not: null } },
    take: 5,
    select: { title: true, imageUrl: true, source: { select: { name: true } } }
  });
  samples.forEach(a => console.log(a.source.name, '|', (a.imageUrl ?? '').substring(0, 120)));
  await prisma.$disconnect();
}

main().catch(console.error);
