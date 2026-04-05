import RSSParser from 'rss-parser';
import prisma from './prisma';

// Configure parser to capture custom RSS fields where images hide
const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'VikingsFeed/1.0 (RSS Aggregator)',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:group', 'mediaGroup'],
      ['content:encoded', 'contentEncoded'],
      ['enclosure', 'enclosures', { keepArray: true }],
    ],
  },
});

export async function fetchAllFeeds(): Promise<{ total: number; errors: string[] }> {
  const sources = await prisma.source.findMany({
    where: { isActive: true, type: 'rss' },
  });

  let total = 0;
  const errors: string[] = [];

  for (const source of sources) {
    try {
      const count = await fetchFeed(source.id, source.feedUrl, source.keywordFilter);
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

async function fetchFeed(sourceId: number, feedUrl: string, keywordFilter: string | null): Promise<number> {
  const feed = await parser.parseURL(feedUrl);
  let added = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of feed.items as any[]) {
    if (!item.title || !item.link) continue;

    // Apply keyword filter if source requires it (e.g., broad sports feeds)
    if (keywordFilter) {
      const text = `${item.title} ${item.contentSnippet || item.content || ''} ${item.link}`.toLowerCase();
      if (!text.includes(keywordFilter.toLowerCase())) continue;
    }

    const externalId = item.guid || item.link;
    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

    // Try RSS-embedded image first, then fall back to og:image scrape
    let imageUrl = extractImage(item);
    if (!imageUrl && item.link) {
      imageUrl = await scrapeOgImage(item.link);
    }

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

// Fetch the article page and extract og:image meta tag
async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VikingsFeed/1.0 (RSS Aggregator)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    // Only read the first 50KB to find og:image quickly
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    // Look for og:image meta tag
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) return ogMatch[1];

    // Also check twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch?.[1]) return twMatch[1];

    return null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(item: any): string | null {
  // 1. Enclosure (standard RSS image attachment)
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  // Check enclosures array from custom fields
  if (Array.isArray(item.enclosures)) {
    for (const enc of item.enclosures) {
      const url = enc?.url || enc?.$?.url;
      const type = enc?.type || enc?.$?.type || '';
      if (url && (type.startsWith('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(url))) {
        return url;
      }
    }
  }

  // 2. media:content (very common for news feeds)
  if (Array.isArray(item.mediaContent)) {
    for (const mc of item.mediaContent) {
      const url = mc?.url || mc?.$?.url;
      if (url) return url;
    }
  }
  // Single media:content object
  const mediaContent = item['media:content'];
  if (mediaContent) {
    const url = mediaContent?.url || mediaContent?.$?.url;
    if (url) return url;
  }

  // 3. media:thumbnail
  if (Array.isArray(item.mediaThumbnail)) {
    for (const mt of item.mediaThumbnail) {
      const url = mt?.url || mt?.$?.url;
      if (url) return url;
    }
  }
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    const url = mediaThumbnail?.url || mediaThumbnail?.$?.url;
    if (url) return url;
  }

  // 4. media:group > media:content
  if (item.mediaGroup) {
    const group = item.mediaGroup;
    const content = group['media:content'] || group.mediaContent;
    if (Array.isArray(content)) {
      for (const mc of content) {
        const url = mc?.url || mc?.$?.url;
        if (url) return url;
      }
    } else if (content) {
      const url = content?.url || content?.$?.url;
      if (url) return url;
    }
  }

  // 5. Extract og:image-style URL from content:encoded or content HTML
  const htmlContent = item.contentEncoded || item['content:encoded'] || item.content || '';
  if (htmlContent) {
    // Look for <img> tags
    const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
      const src = imgMatch[1];
      // Skip tiny tracking pixels and icons
      if (!src.includes('gravatar') && !src.includes('pixel') && !src.includes('1x1')) {
        return src;
      }
    }

    // Look for image URLs in srcset
    const srcsetMatch = htmlContent.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch?.[1]) {
      const firstUrl = srcsetMatch[1].split(',')[0].trim().split(' ')[0];
      if (firstUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(firstUrl)) {
        return firstUrl;
      }
    }
  }

  // 6. Check description for images (some feeds put HTML in description)
  const desc = item.description || '';
  if (desc.includes('<img')) {
    const descImgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (descImgMatch?.[1]) return descImgMatch[1];
  }

  return null;
}
