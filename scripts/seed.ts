import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { createHash } from "crypto";
import { posts, moments, gallery } from "../src/lib/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

// Unsplash photos for realistic visuals
const photos = {
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
  desk: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
  nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  street: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80",
  book: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
  sunset: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  ocean: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",
  city: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
  flower: "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80",
  rain: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80",
  cat: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
};

function toZhText(value: string): string {
  return `【中文】${value}`;
}

function stableUuid(seed: string): string {
  const chars = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ((parseInt(chars[16]!, 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // --- Posts ---
  console.log("📝 Inserting posts...");
  const postsData = [
    {
      slug: "building-minimal-blog-with-nextjs",
      locale: "en",
      title: "Building a Minimal Blog with Next.js 16",
      excerpt: "A deep dive into creating a paper-textured, typography-first blog platform using the latest Next.js features and Turbopack.",
      content: `# Building a Minimal Blog with Next.js 16

The web has become noisy. Every blog looks the same — cookie-cutter templates with generic stock photos and predictable layouts. I wanted something different.

## The Paper Metaphor

I started with a simple question: *what if a website could feel like holding a well-worn notebook?*

This led to the "paper texture" design language:

- **Layered tints**: Three levels of paper color (\`tint-1\`, \`tint-2\`, \`tint-3\`) create depth
- **Ink colors**: Instead of arbitrary grays, we use \`ink\` and \`ink-light\`
- **Shadow system**: \`paper-sm\`, \`paper\`, \`paper-hover\` mimic physical paper stacking

## Typography Choices

Three fonts, each with a purpose:

| Font | Role | Usage |
|------|------|-------|
| Space Grotesk | Display | Headlines, UI elements |
| Crimson Pro | Serif accent | Decorative italic text |
| JetBrains Mono | Monospace | Metadata, timestamps |

## The Bento Grid

The homepage uses a Bento-style grid layout. Each card type has its own personality:

\`\`\`tsx
type FeedItem =
  | ({ type: "post" } & Post)
  | ({ type: "moment" } & Moment)
  | ({ type: "gallery" } & GalleryItem)
  | ActionItem;
\`\`\`

Posts get the largest cards. Moments are compact. Gallery items are visual-first.

## What's Next

- Dark mode support
- RSS feed generation
- Image optimization with \`next/image\`
- Internationalization refinements

The code is open source. Feel free to explore.`,
      coverUrl: photos.desk,
      tags: ["Next.js", "Design", "Typography"],
      status: "published",
      publishedAt: new Date("2026-02-10T08:00:00Z"),
      createdAt: new Date("2026-02-08T10:00:00Z"),
      updatedAt: new Date("2026-02-10T08:00:00Z"),
    },
    {
      slug: "photography-workflow-2026",
      locale: "en",
      title: "My Photography Workflow in 2026",
      excerpt: "From RAW capture to web-ready — how I process, organize, and publish my street photography.",
      content: `# My Photography Workflow in 2026

Every photographer has a system. Here's mine.

## Capture

I shoot primarily with a Fujifilm X-T5, paired with the 23mm f/1.4 for street work and the 56mm f/1.2 for portraits. Everything is shot in RAW + JPEG, with the JPEG using Fuji's Classic Neg simulation as a reference.

## Processing

1. **Import**: Files go into Capture One, organized by date
2. **Cull**: Quick pass to star the keepers (usually 10-15% of a session)
3. **Edit**: Minimal adjustments — exposure, white balance, maybe a slight curve
4. **Export**: Two versions — full-res for archive, 2400px long edge for web

## The Less-Is-More Philosophy

I've learned that the best editing is invisible. If someone notices your post-processing, you've gone too far.

> "The camera is an instrument that teaches people how to see without a camera." — Dorothea Lange

## Publishing

Photos go to this site's gallery first, then selectively to social media. I write EXIF data into the gallery entries because I believe metadata tells a story too.`,
      coverUrl: photos.camera,
      tags: ["Photography", "Workflow", "Fujifilm"],
      status: "published",
      publishedAt: new Date("2026-02-05T14:30:00Z"),
      createdAt: new Date("2026-02-03T09:00:00Z"),
      updatedAt: new Date("2026-02-05T14:30:00Z"),
    },
    {
      slug: "tokyo-wandering-notes",
      locale: "en",
      title: "Tokyo Wandering Notes",
      excerpt: "Three weeks of aimless walking through Tokyo's back streets, capturing the quiet moments between the noise.",
      content: `# Tokyo Wandering Notes

Tokyo is a city of contradictions. The neon-lit chaos of Shibuya exists minutes from the meditative silence of Meiji Shrine.

## Week 1: Shimokitazawa

The vintage shops. The narrow alleys. A coffee shop where the barista remembers your order after one visit. This is the Tokyo the guidebooks skip.

## Week 2: Yanaka

The old Tokyo. Cemetery walks at dusk. A cat sleeping on a temple wall. The scent of incense mixing with grilled fish from a nearby izakaya.

## Week 3: Koenji

Punk rock bars next to traditional sento bathhouses. A record shop with 10,000 vinyl. Rain on concrete. The sound of trains.

---

*Sometimes the best travel photography is just showing up and paying attention.*`,
      coverUrl: photos.tokyo,
      tags: ["Travel", "Tokyo", "Photography"],
      status: "published",
      publishedAt: new Date("2026-01-28T06:00:00Z"),
      createdAt: new Date("2026-01-20T12:00:00Z"),
      updatedAt: new Date("2026-01-28T06:00:00Z"),
    },
    {
      slug: "on-digital-minimalism",
      locale: "en",
      title: "On Digital Minimalism",
      excerpt: "Why I deleted most of my apps and what happened next.",
      content: `# On Digital Minimalism

Last month I deleted 47 apps from my phone. Here's what remained:

- Camera
- Notes
- Maps
- Weather
- Music
- Messages

That's it. No social media. No news apps. No games.

## The First Week

Uncomfortable. My thumb kept reaching for phantom icons. I'd pick up my phone, stare at the sparse home screen, and put it down again.

## The Second Week

I started noticing things. The texture of tree bark. The way light falls through a window at 4pm. Conversations with strangers.

## One Month Later

I read 4 books. I shot 800 photos. I wrote 12,000 words. I slept better.

The phone became a tool again, not a slot machine.`,
      tags: ["Minimalism", "Digital Life", "Essay"],
      status: "published",
      publishedAt: new Date("2026-01-15T09:00:00Z"),
      createdAt: new Date("2026-01-12T08:00:00Z"),
      updatedAt: new Date("2026-01-15T09:00:00Z"),
    },
  ];

  const bilingualPostsData = postsData.flatMap((post) => {
    const translationKey = stableUuid(`post:${post.slug}`);
    return [
      {
        ...post,
        locale: "en" as const,
        translationKey,
      },
      {
        ...post,
        locale: "zh" as const,
        translationKey,
        title: toZhText(post.title),
        excerpt: post.excerpt ? toZhText(post.excerpt) : post.excerpt,
        content: toZhText(post.content),
      },
    ];
  });

  await db
    .insert(posts)
    .values(bilingualPostsData)
    .onConflictDoUpdate({
      target: [posts.locale, posts.slug],
      set: {
        translationKey: sql`excluded.translation_key`,
        title: sql`excluded.title`,
        excerpt: sql`excluded.excerpt`,
        content: sql`excluded.content`,
        coverUrl: sql`excluded.cover_url`,
        tags: sql`excluded.tags`,
        status: sql`excluded.status`,
        publishedAt: sql`excluded.published_at`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  console.log(`  ✓ Upserted ${bilingualPostsData.length} posts`);

  // --- Moments ---
  console.log("💭 Inserting moments...");
  const momentsData = [
    {
      content: "Morning light through the café window. The espresso is perfect today — nutty, with a hint of dark chocolate. Sometimes the simplest mornings are the best.",
      media: [{ type: "image" as const, url: photos.coffee, width: 800, height: 600 }],
      locale: "en",
      visibility: "public",
      location: { name: "Blue Bottle Coffee, Shibuya" },
      createdAt: new Date("2026-02-14T02:30:00Z"),
    },
    {
      content: "Found this quiet street in Yanaka. No tourists, just an old man walking his dog and the distant sound of wind chimes. This is the Tokyo I came for.",
      media: [{ type: "image" as const, url: photos.street, width: 800, height: 533 }],
      locale: "en",
      visibility: "public",
      location: { name: "Yanaka, Tokyo" },
      createdAt: new Date("2026-02-12T07:15:00Z"),
    },
    {
      content: "\"The things you own end up owning you.\" — been thinking about this a lot lately. Started decluttering my workspace. Less stuff, more space to think.",
      locale: "en",
      visibility: "public",
      createdAt: new Date("2026-02-10T14:00:00Z"),
    },
    {
      content: "Rain in Tokyo hits different. The city becomes a watercolor painting — all soft edges and reflected neon. Shot an entire roll of film today just walking through puddles.",
      media: [{ type: "image" as const, url: photos.rain, width: 800, height: 1200 }],
      locale: "en",
      visibility: "public",
      location: { name: "Shinjuku, Tokyo" },
      createdAt: new Date("2026-02-08T11:45:00Z"),
    },
    {
      content: "Just finished reading 'A Swim in a Pond in the Rain' by George Saunders. The way he breaks down storytelling craft is incredible. Every writer should read this.",
      media: [{ type: "image" as const, url: photos.book, width: 800, height: 533 }],
      locale: "en",
      visibility: "public",
      createdAt: new Date("2026-02-06T20:00:00Z"),
    },
    {
      content: "Discovered a tiny ramen shop with only 8 seats. The chef has been making the same recipe for 30 years. Perfection takes patience.",
      locale: "en",
      visibility: "public",
      location: { name: "Koenji, Tokyo" },
      createdAt: new Date("2026-02-04T12:30:00Z"),
    },
    {
      content: "Code flows better at 2am. There's something about the silence of a sleeping city that makes the logic clearer. Shipped a new feature tonight — the gallery EXIF overlay.",
      locale: "en",
      visibility: "public",
      createdAt: new Date("2026-02-02T17:00:00Z"),
    },
    {
      content: "Met a street cat in Shimokitazawa who followed me for three blocks. Named her Pixel. She has excellent taste in back alleys.",
      media: [{ type: "image" as const, url: photos.cat, width: 800, height: 533 }],
      locale: "en",
      visibility: "public",
      location: { name: "Shimokitazawa, Tokyo" },
      createdAt: new Date("2026-01-30T09:20:00Z"),
    },
    {
      content: "[MOCK_MULTI] Morning walk sequence: first light at the tower, then coffee steam, then late-afternoon crosswalk. Testing multi-image moment rendering on home and preview.",
      media: [
        { type: "image" as const, url: photos.tokyo, width: 800, height: 533 },
        { type: "image" as const, url: photos.coffee, width: 800, height: 600 },
        { type: "image" as const, url: photos.city, width: 800, height: 1200 },
      ],
      locale: "en",
      visibility: "public",
      location: { name: "Shinjuku → Shibuya, Tokyo" },
      createdAt: new Date("2026-02-18T06:40:00Z"),
    },
    {
      content: "[MOCK_TEXT] No photo today. Just notes from the train: the window shook at every station, someone kept reading the same paragraph, and the city felt slower than usual.",
      locale: "en",
      visibility: "public",
      location: { name: "JR Yamanote Line" },
      createdAt: new Date("2026-02-17T12:10:00Z"),
    },
  ];

  const bilingualMomentsData = momentsData.flatMap((moment, index) => {
    const translationKey = stableUuid(
      `moment:${index}:${moment.createdAt.toISOString()}:${moment.content}`
    );
    return [
      {
        ...moment,
        locale: "en" as const,
        translationKey,
      },
      {
        ...moment,
        locale: "zh" as const,
        translationKey,
        content: toZhText(moment.content),
        location: moment.location
          ? { ...moment.location, name: toZhText(moment.location.name) }
          : undefined,
      },
    ];
  });

  await db
    .insert(moments)
    .values(bilingualMomentsData)
    .onConflictDoUpdate({
      target: [moments.translationKey, moments.locale],
      set: {
        content: sql`excluded.content`,
        media: sql`excluded.media`,
        visibility: sql`excluded.visibility`,
        location: sql`excluded.location`,
        status: sql`excluded.status`,
        publishedAt: sql`excluded.published_at`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  console.log(`  ✓ Upserted ${bilingualMomentsData.length} moments`);

  // --- Gallery ---
  console.log("🖼️  Inserting gallery items...");
  const galleryData = [
    {
      locale: "en",
      fileUrl: photos.tokyo,
      thumbUrl: photos.tokyo,
      title: "Tokyo Tower at Dusk",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-02-13T09:45:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/2.8",
      iso: 400,
      latitude: 35.6586,
      longitude: 139.7454,
      createdAt: new Date("2026-02-13T10:00:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.street,
      thumbUrl: photos.street,
      title: "Back Alley, Yanaka",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-02-11T06:30:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 56mm f/1.2",
      focalLength: "56mm",
      aperture: "f/1.8",
      iso: 200,
      latitude: 35.7245,
      longitude: 139.7672,
      createdAt: new Date("2026-02-11T07:00:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.sunset,
      thumbUrl: photos.sunset,
      title: "Sunset over Sumida River",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-02-09T09:10:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/8",
      iso: 100,
      latitude: 35.7101,
      longitude: 139.8017,
      createdAt: new Date("2026-02-09T09:30:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.mountain,
      thumbUrl: photos.mountain,
      title: "Mt. Fuji from Kawaguchiko",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-02-07T23:00:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 56mm f/1.2",
      focalLength: "56mm",
      aperture: "f/5.6",
      iso: 100,
      latitude: 35.5116,
      longitude: 138.7556,
      createdAt: new Date("2026-02-07T23:30:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.ocean,
      thumbUrl: photos.ocean,
      title: "Enoshima Shoreline",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-02-05T05:20:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/4",
      iso: 100,
      latitude: 35.3009,
      longitude: 139.4793,
      createdAt: new Date("2026-02-05T05:45:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.city,
      thumbUrl: photos.city,
      title: "Shinjuku Crossing",
      width: 1600,
      height: 2400,
      capturedAt: new Date("2026-02-03T10:15:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/2",
      iso: 800,
      latitude: 35.6938,
      longitude: 139.7034,
      createdAt: new Date("2026-02-03T10:30:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.flower,
      thumbUrl: photos.flower,
      title: "Plum Blossoms, Ueno Park",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-01-31T04:00:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 56mm f/1.2",
      focalLength: "56mm",
      aperture: "f/1.2",
      iso: 100,
      latitude: 35.7146,
      longitude: 139.7742,
      createdAt: new Date("2026-01-31T04:30:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.nature,
      thumbUrl: photos.nature,
      title: "Bamboo Path, Kamakura",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-01-28T06:30:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/2.8",
      iso: 400,
      latitude: 35.3192,
      longitude: 139.5466,
      createdAt: new Date("2026-01-28T07:00:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.food,
      thumbUrl: photos.food,
      title: "Tsukiji Morning Market",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-01-25T00:30:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/2",
      iso: 1600,
      latitude: 35.6654,
      longitude: 139.7707,
      createdAt: new Date("2026-01-25T01:00:00Z"),
    },
    {
      locale: "en",
      fileUrl: photos.rain,
      thumbUrl: photos.rain,
      title: "Rainy Night, Kagurazaka",
      width: 1600,
      height: 2400,
      capturedAt: new Date("2026-01-22T13:00:00Z"),
      camera: "Fujifilm X-T5",
      lens: "XF 23mm f/1.4",
      focalLength: "23mm",
      aperture: "f/1.4",
      iso: 3200,
      latitude: 35.7017,
      longitude: 139.7413,
      createdAt: new Date("2026-01-22T13:30:00Z"),
    },
  ];

  const bilingualGalleryData = galleryData.flatMap((item, index) => {
    const translationKey = stableUuid(
      `gallery:${index}:${item.createdAt.toISOString()}:${item.fileUrl}`
    );
    return [
      {
        ...item,
        locale: "en" as const,
        translationKey,
      },
      {
        ...item,
        locale: "zh" as const,
        translationKey,
        title: item.title ? toZhText(item.title) : item.title,
      },
    ];
  });

  await db
    .insert(gallery)
    .values(bilingualGalleryData)
    .onConflictDoUpdate({
      target: [gallery.translationKey, gallery.locale],
      set: {
        fileUrl: sql`excluded.file_url`,
        thumbUrl: sql`excluded.thumb_url`,
        title: sql`excluded.title`,
        width: sql`excluded.width`,
        height: sql`excluded.height`,
        capturedAt: sql`excluded.captured_at`,
        camera: sql`excluded.camera`,
        lens: sql`excluded.lens`,
        focalLength: sql`excluded.focal_length`,
        aperture: sql`excluded.aperture`,
        iso: sql`excluded.iso`,
        latitude: sql`excluded.latitude`,
        longitude: sql`excluded.longitude`,
        status: sql`excluded.status`,
        publishedAt: sql`excluded.published_at`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  console.log(`  ✓ Upserted ${bilingualGalleryData.length} gallery items`);

  console.log("🔁 Backfilling zh variants for legacy en-only content...");

  await db.execute(sql`
    INSERT INTO posts (
      translation_key,
      slug,
      locale,
      title,
      excerpt,
      content,
      cover_url,
      tags,
      status,
      published_at,
      created_at,
      updated_at,
      revision,
      updated_by,
      deleted_at
    )
    SELECT
      p.translation_key,
      p.slug,
      'zh',
      '【中文】' || p.title,
      CASE WHEN p.excerpt IS NULL THEN NULL ELSE '【中文】' || p.excerpt END,
      '【中文】' || p.content,
      p.cover_url,
      p.tags,
      p.status,
      p.published_at,
      p.created_at,
      p.updated_at,
      p.revision,
      p.updated_by,
      p.deleted_at
    FROM posts p
    WHERE p.locale = 'en'
      AND NOT EXISTS (
        SELECT 1
        FROM posts z
        WHERE z.translation_key = p.translation_key
          AND z.locale = 'zh'
      )
    ON CONFLICT (locale, slug) DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO moments (
      translation_key,
      content,
      media,
      locale,
      visibility,
      location,
      status,
      published_at,
      created_at,
      updated_at,
      deleted_at
    )
    SELECT
      m.translation_key,
      '【中文】' || m.content,
      m.media,
      'zh',
      m.visibility,
      CASE
        WHEN m.location IS NULL THEN NULL
        WHEN m.location ? 'name'
          THEN jsonb_set(
            m.location,
            '{name}',
            to_jsonb(('【中文】' || (m.location ->> 'name'))::text),
            true
          )
        ELSE m.location
      END,
      m.status,
      m.published_at,
      m.created_at,
      m.updated_at,
      m.deleted_at
    FROM moments m
    WHERE m.locale = 'en'
      AND NOT EXISTS (
        SELECT 1
        FROM moments z
        WHERE z.translation_key = m.translation_key
          AND z.locale = 'zh'
      )
    ON CONFLICT (translation_key, locale) DO NOTHING;
  `);

  await db.execute(sql`
    INSERT INTO gallery (
      translation_key,
      locale,
      file_url,
      thumb_url,
      title,
      width,
      height,
      captured_at,
      camera,
      lens,
      focal_length,
      aperture,
      iso,
      latitude,
      longitude,
      is_live_photo,
      video_url,
      status,
      published_at,
      created_at,
      updated_at,
      deleted_at
    )
    SELECT
      g.translation_key,
      'zh',
      g.file_url,
      g.thumb_url,
      CASE WHEN g.title IS NULL THEN NULL ELSE '【中文】' || g.title END,
      g.width,
      g.height,
      g.captured_at,
      g.camera,
      g.lens,
      g.focal_length,
      g.aperture,
      g.iso,
      g.latitude,
      g.longitude,
      g.is_live_photo,
      g.video_url,
      g.status,
      g.published_at,
      g.created_at,
      g.updated_at,
      g.deleted_at
    FROM gallery g
    WHERE g.locale = 'en'
      AND NOT EXISTS (
        SELECT 1
        FROM gallery z
        WHERE z.translation_key = g.translation_key
          AND z.locale = 'zh'
      )
    ON CONFLICT (translation_key, locale) DO NOTHING;
  `);

  console.log("\n✅ Seed complete!");
  console.log(
    `   ${bilingualPostsData.length} posts, ${bilingualMomentsData.length} moments, ${bilingualGalleryData.length} gallery items`
  );

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
