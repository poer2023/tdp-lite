import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticlePaperDetail } from "@/components/stitch-details/ArticlePaperDetail";
import { getPublicPost } from "@/lib/content/read";
import { toLocalizedPath } from "@/lib/locale-routing";

export const dynamic = "force-dynamic";

type Locale = "en" | "zh";

interface PostPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

const avatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1";

export default async function PostPage({ params }: PostPageProps) {
  const { locale, slug } = await params;

  const post = await getPublicPost(locale, slug);

  if (!post) {
    notFound();
  }

  // Estimate reading time (~200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

  // Format the published date
  const publishedDate = post.publishedAt
    ? formatDate(post.publishedAt, locale)
    : formatDate(post.createdAt, locale);

  // Extract category from first tag or default
  const category = post.tags && post.tags.length > 0 ? post.tags[0] : "Journal";

  return (
    <div className="min-h-screen bg-[#e8e8e6]">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 p-6 md:p-10">
        <ArticlePaperDetail
          title={post.title}
          excerpt={post.excerpt || undefined}
          kicker={category}
          publishedDate={publishedDate}
          readingTime={readingTime}
          category={category}
          backHref={toLocalizedPath(locale, "/")}
          avatarSrc={avatar}
          content={
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          }
        />
      </div>
    </div>
  );
}
