import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Locale = "en" | "zh";

interface PostPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

async function getPost(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/posts/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.post || null;
  } catch {
    return null;
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { locale, slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="prose prose-gray max-w-none dark:prose-invert">
      <header className="mb-8 not-prose">
        <h1 className="mb-4 text-4xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-4 text-gray-500">
          {post.publishedAt && (
            <time>{formatDate(post.publishedAt, locale)}</time>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded bg-gray-100 px-2 py-0.5 text-sm dark:bg-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
    </article>
  );
}
