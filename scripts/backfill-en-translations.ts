import { randomUUID } from "node:crypto";
import { buildTdpSignature, sha256Hex } from "../publisher/lib/signature";

type HttpMethod = "GET" | "POST" | "PATCH";

type PublicPost = {
  id: string;
  translationKey: string;
  slug: string;
  locale: "zh" | "en";
  title: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  tags: string[];
  status: string;
  cardSpan?: string | null;
  publishedAt?: string | null;
  createdAt: string;
};

type MomentMediaItem = {
  type: "image" | "video";
  url: string;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  capturedAt?: string | null;
  camera?: string | null;
  lens?: string | null;
  focalLength?: string | null;
  aperture?: string | null;
  iso?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

type MomentLocation = {
  name: string;
  lat?: number | null;
  lng?: number | null;
};

type PublicMoment = {
  id: string;
  translationKey: string;
  content: string;
  media: MomentMediaItem[];
  locale: "zh" | "en";
  visibility: "public" | "private";
  location?: MomentLocation | null;
  status: string;
  cardSpan?: string | null;
  publishedAt?: string | null;
  createdAt: string;
};

type ManagedPost = PublicPost & {
  updatedAt: string;
  revision: number;
};

type ManagedMoment = PublicMoment & {
  updatedAt: string;
};

type PostTranslation = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
};

const POST_TRANSLATIONS: Record<string, PostTranslation> = {
  "460af65f-a613-4164-9df7-e5a91786e5d3": {
    title: "Testing the New Editor, I Need the Word Limit Removed",
    slug: "testing-the-new-editor-i-need-the-word-limit-removed",
    excerpt: "Seriously, who makes you write your own summary?",
    content:
      "***Just testing***\n\nThree\n\n![](https://pub-f78c8f620c5b48928ac88fda27cd6bcc.r2.dev/2026/03/17/12609beb-5642-462d-8707-42921f2827a3.jpg)",
    tags: [],
  },
  "96e3a168-6302-4510-a964-002f1effd3e5": {
    title: "I'm Really Out of Options",
    slug: "im-really-out-of-options",
    excerpt: "Being a product manager is my karmic punishment.",
    content: `# I Spent an Hour Explaining the Logic, and He Still Didn't Get It

Today was so absurd I could only laugh. To help a developer understand a business rule that honestly was not even that complicated, I spent nearly a full hour walking through everything from start to finish: the background, the scenario, the inputs and outputs, the edge cases, the exact calculations, and the decision rules. I even broke every branch down separately and illustrated each one with examples.

And what happened? He still looked completely lost, like I was speaking some alien language.  
I wrote out the formulas and he said, "I still don't quite get it." I turned the logic into a step-by-step list and he said, "It still feels a bit abstract." I plugged in real data and demonstrated the whole flow, and he still asked, "Could you explain it in more detail?"

By the end, I started wondering whether the problem was that my logic was too clear, so clear that it had gone beyond the range of comprehension.  
I explained the same logic three times, from macro to micro, from business intent to implementation. I even spelled out elementary-school-level conditions like, "If A, then B; otherwise go to branch C." And still, he could not grasp the point.

I'm not being harsh. I'm honestly just exhausted.  
When you've already explained both the calculation and the judgment criteria to this extent and the other person still cannot follow, you stop suspecting a communication problem. You start suspecting that comprehension itself has already left the battlefield.`,
    tags: [],
  },
  "772ff7ae-c4ce-4746-b6e5-e41279af8df2": {
    title: "Test Blog 1",
    slug: "test-blog-1",
    excerpt: "The secret of testing is testing itself.",
    content:
      "## A test article ought to contain some test content\n### Markdown preview",
    tags: ["Learning"],
  },
};

const MOMENT_TRANSLATIONS: Record<string, string> = {
  "f6cc950d-be1c-408d-8be8-8e6c06113bd4":
    "Fixed it. Didn't realize it had been down for five days.",
  "598c7513-8047-4ba6-bbd2-a1ac6f829742":
    "It's rare for me to get to the office this early.",
  "c7f55cb3-d2a6-4e0e-bd39-1e715756a536": "Testing video publishing",
  "6909c65c-4334-4f85-bae5-7807ff51698d": "Untitled",
  "8488ce2b-88fb-4812-94c4-9e72ba7061cd":
    "I'm out of options. After an extra hour of overtime, just as I was about to leave, the boss suddenly remembered he wanted to talk requirements. nngt",
  "5461aa46-f16b-4e51-b2c8-1e9613c712b5": "miji!!",
  "fa2188aa-1aeb-4dcd-8efc-561954385c2e":
    "Had to test it the moment I fixed it.",
  "7b951133-7c0d-47a4-87cd-8cfcfe458cf3":
    "Went out for a walk. The citywalk ended up being ridiculously long.",
  "c94c5c65-4786-4858-9773-5f5b7b90a396":
    "This round was cursed, but I think it's still enough for a 2+1.",
  "5e6a0787-f2e1-46bd-bd68-2e288c4d3316":
    "So good!! Maruko is genuinely gifted!!",
  "50c19361-8e6c-466c-b82d-2ecb0ae461d1": "Untitled",
  "4c6b1013-5e9e-458b-92e9-54f5ed91b5f6": "Had dinner with her.",
  "06cf12a0-f0e8-457e-87cf-20a97b6b47a4":
    "I've been really happy lately. I've done so many things.",
  "f0b083e8-2d26-4eb4-929e-54508929a2ac": "Test 3",
  "1f8a3c24-4765-4c83-ab72-bf7c25a70493": "Shot beneath the restroom.",
  "bcc0abb3-a161-4061-8372-5b565f472e41":
    "Last night was one thing; today feels much gloomier.",
  "04cfda16-a08c-4307-b75a-cad70e63d0b8":
    "Went to see the new place over the weekend, signed the contract at lightning speed, and now I'm about to start over in a new environment again.",
  "40e1680e-d169-429b-b44f-c105436247d9":
    "Fixed the image posting feature a bit.",
  "b103380b-573b-4fb2-b203-5cd0d6c758f4": "Tonight's sunset glow",
  "d26761bf-1f45-4fc9-be40-45b0ae6246f9": "miji",
  "2a7d05e3-d836-483c-9825-eac2729661ef":
    "I've quietly added a lot more lately. The homepage is finally one quarter done.",
  "61ed6eeb-d67a-453d-a63b-c9488468a75c": "Delicious!",
  "13e28633-6ed9-4e05-8efc-8c095e6b6dd0": "Untitled",
  "c7ae1938-d878-4a94-8f39-190fe5969ba5": "A slightly naughty little cat",
  "25b41c1e-7566-41dc-8ce1-a256dd3560df": "It came out a little too green.",
  "36fc6f92-357d-4ab3-9526-2a594dbe7609": "This drink is really strong.",
  "47418c9d-9484-4646-9391-bfa96002501f": "A beautiful horse",
  "be9610ed-53f1-44b4-b0d3-5bc9daa6ea1c":
    "I've been grinding on this for days. I'm getting irritated. I don't want to do it anymore.",
  "c3de6839-e95e-4fd0-951a-3934ad4e6575":
    "I've actually built quite a lot lately. The CC relay credits I bought recently have barely gone to waste, and I've been nonstop, just writing feature after feature. Most of what I've been building these past few days has been backend work. The frontend is buried way too deep.\n\nBut based on past experience, there's a good chance that in a few days I'll end up merging features and pages all over again.",
  "a2c402f2-2a25-4d07-a0c2-706488eed36f": "Testing the image fix",
  "f4aca36c-0bb1-4869-badd-5adc774c9673":
    "Today I came across a pretty good image, then used grok to generate a video version of it, and the result was surprisingly decent. The problem is that I still haven't built video upload. I honestly thought I wouldn't need it.",
  "e6a255af-ae4a-459a-853d-e7abc7c2cbe9":
    "During the holiday, the neighbor next door died suddenly at home and wasn't discovered for at least three days.",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function targetConfig() {
  return {
    baseUrl: (
      process.env.PUBLISH_TARGET_BASE_URL ||
      requireEnv("COOLIFY_PUBLISH_TARGET_BASE_URL")
    ).replace(/\/$/, ""),
    keyId: requireEnv("TDP_INTERNAL_KEY_ID"),
    keySecret: requireEnv("TDP_INTERNAL_KEY_SECRET"),
  };
}

function canonicalPathAndQuery(pathWithQuery: string) {
  const url = new URL(pathWithQuery, "http://local");
  return {
    path: url.pathname,
    query: url.search.startsWith("?") ? url.search.slice(1) : "",
  };
}

async function signedRequest<T>(params: {
  method: HttpMethod;
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}): Promise<T> {
  const cfg = targetConfig();
  const { path, query } = canonicalPathAndQuery(params.path);
  const rawBody =
    params.body === undefined ? new Uint8Array() : new TextEncoder().encode(JSON.stringify(params.body));
  const timestamp = Date.now().toString();
  const nonce = randomUUID();
  const signature = buildTdpSignature({
    keySecret: cfg.keySecret,
    method: params.method,
    path,
    query,
    timestamp,
    nonce,
    bodyHash: sha256Hex(rawBody),
  });

  const response = await fetch(`${cfg.baseUrl}${params.path}`, {
    method: params.method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TDP-Key-Id": cfg.keyId,
      "X-TDP-Timestamp": timestamp,
      "X-TDP-Nonce": nonce,
      "X-TDP-Signature": signature,
      ...(params.idempotencyKey
        ? { "Idempotency-Key": params.idempotencyKey }
        : {}),
    },
    body: params.method === "GET" ? undefined : Buffer.from(rawBody),
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${params.method} ${params.path} failed: ${response.status} ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function publicRequest<T>(path: string): Promise<T> {
  const baseUrl = targetConfig().baseUrl;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${text}`);
  }
  return JSON.parse(text) as T;
}

function translationForPost(source: PublicPost): PostTranslation {
  const translation = POST_TRANSLATIONS[source.translationKey];
  if (!translation) {
    throw new Error(`Missing post translation for ${source.translationKey}`);
  }
  return translation;
}

function translationForMoment(source: PublicMoment): string {
  const translation = MOMENT_TRANSLATIONS[source.translationKey];
  if (!translation) {
    throw new Error(`Missing moment translation for ${source.translationKey}`);
  }
  return translation;
}

async function fetchPublicPosts(): Promise<PublicPost[]> {
  const response = await publicRequest<{ items: PublicPost[] }>(
    "/v1/public/posts?locale=zh&limit=100"
  );
  return response.items;
}

async function fetchPublicMoments(): Promise<PublicMoment[]> {
  const response = await publicRequest<{ items: PublicMoment[] }>(
    "/v1/public/moments?locale=zh&limit=100"
  );
  return response.items;
}

async function fetchManagedPosts(): Promise<ManagedPost[]> {
  const response = await signedRequest<{ items: ManagedPost[] }>({
    method: "GET",
    path: "/v1/posts?locale=en&status=all&limit=200",
  });
  return response.items;
}

async function fetchManagedMoments(): Promise<ManagedMoment[]> {
  const response = await signedRequest<{ items: ManagedMoment[] }>({
    method: "GET",
    path: "/v1/moments?locale=en&status=all&limit=200",
  });
  return response.items;
}

async function upsertPosts(
  zhPosts: PublicPost[],
  existingEnPosts: ManagedPost[]
) {
  const existingByKey = new Map(
    existingEnPosts.map((item) => [item.translationKey, item] as const)
  );

  let created = 0;
  let updated = 0;

  for (const source of zhPosts) {
    const translation = translationForPost(source);
    const createPayload = {
      translationKey: source.translationKey,
      locale: "en",
      title: translation.title,
      slug: translation.slug,
      excerpt: translation.excerpt,
      content: translation.content,
      coverUrl: source.coverUrl ?? null,
      tags: translation.tags,
      status: "published",
      cardSpan: source.cardSpan ?? "auto",
      publishedAt: source.publishedAt ?? source.createdAt,
    };
    const updatePayload = {
      title: translation.title,
      slug: translation.slug,
      excerpt: translation.excerpt,
      content: translation.content,
      coverUrl: source.coverUrl ?? null,
      tags: translation.tags,
      status: "published",
      cardSpan: source.cardSpan ?? "auto",
      publishedAt: source.publishedAt ?? source.createdAt,
    };

    const existing = existingByKey.get(source.translationKey);
    if (existing) {
      await signedRequest({
        method: "PATCH",
        path: `/v1/posts/${existing.id}`,
        body: updatePayload,
        idempotencyKey: randomUUID(),
      });
      updated += 1;
      console.log(`updated post ${source.translationKey} -> ${translation.slug}`);
      continue;
    }

    await signedRequest({
      method: "POST",
      path: "/v1/posts",
      body: createPayload,
      idempotencyKey: randomUUID(),
    });
    created += 1;
    console.log(`created post ${source.translationKey} -> ${translation.slug}`);
  }

  return { created, updated };
}

async function upsertMoments(
  zhMoments: PublicMoment[],
  existingEnMoments: ManagedMoment[]
) {
  const existingByKey = new Map(
    existingEnMoments.map((item) => [item.translationKey, item] as const)
  );

  let created = 0;
  let updated = 0;

  for (const source of zhMoments) {
    const createPayload = {
      translationKey: source.translationKey,
      content: translationForMoment(source),
      locale: "en",
      visibility: source.visibility,
      location: source.location ?? null,
      media: source.media,
      status: "published",
      cardSpan: source.cardSpan ?? "auto",
      publishedAt: source.publishedAt ?? source.createdAt,
    };
    const updatePayload = {
      content: translationForMoment(source),
      visibility: source.visibility,
      location: source.location ?? null,
      media: source.media,
      status: "published",
      cardSpan: source.cardSpan ?? "auto",
      publishedAt: source.publishedAt ?? source.createdAt,
    };

    const existing = existingByKey.get(source.translationKey);
    if (existing) {
      await signedRequest({
        method: "PATCH",
        path: `/v1/moments/${existing.id}`,
        body: updatePayload,
        idempotencyKey: randomUUID(),
      });
      updated += 1;
      console.log(`updated moment ${source.translationKey}`);
      continue;
    }

    await signedRequest({
      method: "POST",
      path: "/v1/moments",
      body: createPayload,
      idempotencyKey: randomUUID(),
    });
    created += 1;
    console.log(`created moment ${source.translationKey}`);
  }

  return { created, updated };
}

async function main() {
  const [zhPosts, zhMoments, existingEnPosts, existingEnMoments] =
    await Promise.all([
      fetchPublicPosts(),
      fetchPublicMoments(),
      fetchManagedPosts(),
      fetchManagedMoments(),
    ]);

  if (Object.keys(POST_TRANSLATIONS).length !== zhPosts.length) {
    throw new Error(
      `Post translation map mismatch: have ${Object.keys(POST_TRANSLATIONS).length}, expected ${zhPosts.length}`
    );
  }
  if (Object.keys(MOMENT_TRANSLATIONS).length !== zhMoments.length) {
    throw new Error(
      `Moment translation map mismatch: have ${Object.keys(MOMENT_TRANSLATIONS).length}, expected ${zhMoments.length}`
    );
  }

  const postSummary = await upsertPosts(zhPosts, existingEnPosts);
  const momentSummary = await upsertMoments(zhMoments, existingEnMoments);

  console.log(
    JSON.stringify(
      {
        posts: postSummary,
        moments: momentSummary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
