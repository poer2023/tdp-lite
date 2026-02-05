import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Locale = "en" | "zh";

interface PostsPageProps {
  params: Promise<{ locale: Locale }>;
}

// Fetch posts from API
async function getPosts(locale: Locale) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(
      `${baseUrl}/api/posts?locale=${locale}&status=published`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts || [];
  } catch {
    return [];
  }
}

export default async function PostsPage({ params }: PostsPageProps) {
  const { locale } = await params;
  const posts = await getPosts(locale);

  const t = {
    en: { title: "Posts", empty: "No posts yet." },
    zh: { title: "文章", empty: "暂无文章。" },
  }[locale];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {posts.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="space-y-6">
          {posts.map(
            (post: {
              id: string;
              slug: string;
              title: string;
              excerpt?: string;
              publishedAt?: string;
              tags?: string[];
            }) => (
              <article
                key={post.id}
                className="border-b pb-6 last:border-b-0"
              >
                <Link href={`/${locale}/posts/${post.slug}`}>
                  <h2 className="mb-2 text-xl font-semibold hover:text-gray-600 dark:hover:text-gray-300">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p className="mb-2 text-gray-600 dark:text-gray-400">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {post.publishedAt && (
                    <time>{formatDate(post.publishedAt, locale)}</time>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex gap-2">
                      {post.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
