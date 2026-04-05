import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VIKINGS_SOURCES = [
  {
    name: 'Minnesota Vikings Official',
    url: 'https://www.vikings.com',
    feedUrl: 'https://www.vikings.com/rss/news',
    logoUrl: 'https://static.www.nfl.com/image/private/f_auto/league/teguylrnqqmfcwxvcmmz',
    tier: 'official',
    allowsIframe: false,
    keywordFilter: null,
  },
  {
    name: 'Daily Norseman',
    url: 'https://www.dailynorseman.com',
    feedUrl: 'https://www.dailynorseman.com/rss/index.xml',
    logoUrl: null,
    tier: 'fan',
    allowsIframe: true,
    keywordFilter: null,
  },
  {
    name: 'Vikings Territory',
    url: 'https://vikingsterritory.com',
    feedUrl: 'https://vikingsterritory.com/feed',
    logoUrl: null,
    tier: 'fan',
    allowsIframe: true,
    keywordFilter: null,
  },
  {
    name: 'ESPN - Vikings',
    url: 'https://www.espn.com/nfl/team/_/name/min/minnesota-vikings',
    feedUrl: 'https://www.espn.com/espn/rss/nfl/news',
    logoUrl: null,
    tier: 'beat',
    allowsIframe: false,
    keywordFilter: null,
  },
  {
    name: 'ProFootballTalk - Vikings',
    url: 'https://profootballtalk.nbcsports.com',
    feedUrl: 'https://profootballtalk.nbcsports.com/feed/',
    logoUrl: null,
    tier: 'beat',
    allowsIframe: false,
    keywordFilter: null,
  },
  {
    name: 'Star Tribune - Vikings',
    url: 'https://www.startribune.com/sports/vikings/',
    feedUrl: 'https://www.startribune.com/feed/sports/index.rss',
    logoUrl: null,
    tier: 'beat',
    allowsIframe: false,
    keywordFilter: 'vikings', // Broad sports feed — filter to Vikings only
  },
  {
    name: 'Purple Insider',
    url: 'https://purpleinsider.com',
    feedUrl: 'https://purpleinsider.com/feed/',
    logoUrl: null,
    tier: 'fan',
    allowsIframe: true,
    keywordFilter: null,
  },
  {
    name: 'Purple PTSD',
    url: 'https://purpleptsd.com',
    feedUrl: 'https://purpleptsd.com/feed/',
    logoUrl: null,
    tier: 'fan',
    allowsIframe: true,
    keywordFilter: null,
  },
  {
    name: 'The Viking Age',
    url: 'https://thevikingage.com',
    feedUrl: 'https://thevikingage.com/feed/',
    logoUrl: null,
    tier: 'fan',
    allowsIframe: true,
    keywordFilter: null,
  },
];

async function main() {
  console.log('Seeding Vikings RSS sources...');

  // Remove old Vikings Wire source if it exists (was dead)
  await prisma.source.deleteMany({
    where: { feedUrl: 'https://vikingswire.usatoday.com/feed/' },
  });

  for (const source of VIKINGS_SOURCES) {
    await prisma.source.upsert({
      where: { feedUrl: source.feedUrl },
      create: source,
      update: {
        name: source.name,
        url: source.url,
        allowsIframe: source.allowsIframe,
        tier: source.tier,
        keywordFilter: source.keywordFilter,
      },
    });
    console.log(`  ✓ ${source.name} (${source.tier})`);
  }

  console.log(`\nSeeded ${VIKINGS_SOURCES.length} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
