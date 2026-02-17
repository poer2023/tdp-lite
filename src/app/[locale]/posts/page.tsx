import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { getPublicPosts } from "@/lib/content/read";
import { isAppLocale, type AppLocale } from "@/lib/locale";

// Force dynamic rendering to avoid database queries during build
export const dynamic = "force-dynamic";

type Locale = AppLocale;

interface PostsPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function PostsPage({ params }: PostsPageProps) {
  const { locale } = await params;

  // Validate locale to prevent [locale] catching non-locale paths like "api"
  const validLocale = isAppLocale(locale) ? locale : "en";

  const postsData = await getPublicPosts(validLocale);

  const t = {
    en: { title: "Posts", empty: "No posts yet." },
    zh: { title: "文章", empty: "暂无文章。" },
  }[validLocale];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {postsData.length === 0 ? (
        <p className="text-gray-500">{t.empty}</p>
      ) : (
        <div className="space-y-6">
          {postsData.map((post) => (
              <article
                key={post.id}
                className="border-b pb-6 last:border-b-0"
              >
                <Link href={`/${validLocale}/posts/${post.slug}`}>
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
                    <time>{formatDate(post.publishedAt, validLocale)}</time>
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
