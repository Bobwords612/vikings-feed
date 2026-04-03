import RSSParser from 'rss-parser';
import prisma from './prisma';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'VikingsFeed/1.0 (RSS Aggregator)',
  },
});

/**
 * Fetch and store articles from all active RSS sources.
 * Returns count of new articles added.
 */
export async function fetchAllFeeds(): Promise<{ total: number; errors: string[] }> {
  const sources = await prisma.source.findMany({
    where: { isActive: true, type: 'rss' },
  });

  let total = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const count = await fetchFeed(source.id, source.feedUrl);
      total += count;

      await prisma.source.update({
        where: { id: source.id },
        data: { lastFetched: new Date() },
      });
    } catch (err) {
      const msg = `[${source.name}] ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(msg);
      console.error(msg);
    }
  }

  return { total, errors };
}

async function fetchFeed(sourceId: number, feedUrl: string): Promise<number> {
  const feed = await parser.parseURL(feedUrl);
  let added = 0;

  for (const item of feed.items) {
    if (!item.title || !item.link) continue;

    const externalId = item.guid || item.id || item.link;
    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

    // Extract image from various RSS fields
    const imageUrl = extractImage(item);

    try {
      await prisma.article.upsert({
        where: {
          sourceId_externalId: { sourceId, externalId },
        },
        create: {
          sourceId,
          externalId,
          title: item.title,
          description: item.contentSnippet || item.content?.substring(0, 500) || null,
          content: item.content || null,
          url: item.link,
          imageUrl,
          author: item.creator || item.author || null,
          publishedAt,
        },
        update: {
          title: item.title,
          imageUrl: imageUrl || undefined,
        },
      });
      added++;
    } catch {
      // Duplicate or constraint error — skip
    }
  }

  return added;
}

function extractImage(item: RSSParser.Item & Record<string, unknown>): string | null {
  // Check common RSS image fields
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }

  // media:content or media:thumbnail
  const media = item['media:content'] as { $?: { url?: string } } | undefined;
  if (media?.$?.url) return media.$.url;

  const thumb = item['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (thumb?.$?.url) return thumb.$.url;

  // Extract first image from HTML content
  const content = item.content || item['content:encoded'] as string || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  return null;
}
