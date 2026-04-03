import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VIKINGS_SOURCES = [
  {
    name: 'Minnesota Vikings Official',
    url: 'https://www.vikings.com',
    feedUrl: 'https://www.vikings.com/news/rss.xml',
    logoUrl: 'https://static.www.nfl.com/image/private/f_auto/league/teguylrnqqmfcwxvcmmz',
  },
  {
    name: 'Daily Norseman',
    url: 'https://www.dailynorseman.com',
    feedUrl: 'https://www.dailynorseman.com/rss/current',
    logoUrl: null,
  },
  {
    name: 'Vikings Territory',
    url: 'https://vikingsterritory.com',
    feedUrl: 'https://vikingsterritory.com/feed',
    logoUrl: null,
  },
  {
    name: 'ESPN - Vikings',
    url: 'https://www.espn.com/nfl/team/_/name/min/minnesota-vikings',
    feedUrl: 'https://www.espn.com/espn/rss/nfl/news',
    logoUrl: null,
  },
  {
    name: 'ProFootballTalk - Vikings',
    url: 'https://profootballtalk.nbcsports.com',
    feedUrl: 'https://profootballtalk.nbcsports.com/feed/',
    logoUrl: null,
  },
  {
    name: 'Star Tribune - Vikings',
    url: 'https://www.startribune.com/sports/vikings/',
    feedUrl: 'https://www.startribune.com/sports/vikings/feed/',
    logoUrl: null,
  },
  {
    name: 'Purple Insider',
    url: 'https://purpleinsider.com',
    feedUrl: 'https://purpleinsider.com/feed/',
    logoUrl: null,
  },
  {
    name: 'Vikings Wire (USA Today)',
    url: 'https://vikingswire.usatoday.com',
    feedUrl: 'https://vikingswire.usatoday.com/feed/',
    logoUrl: null,
  },
];

async function main() {
  console.log('Seeding Vikings RSS sources...');

  for (const source of VIKINGS_SOURCES) {
    await prisma.source.upsert({
      where: { feedUrl: source.feedUrl },
      create: source,
      update: { name: source.name, url: source.url },
    });
    console.log(`  ✓ ${source.name}`);
  }

  console.log(`\nSeeded ${VIKINGS_SOURCES.length} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
