import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { ArticlePaperDetail } from "@/components/stitch-details/ArticlePaperDetail";
import {
  getPublicPost,
  getPublicPostByTranslationKey,
} from "@/lib/content/read";
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
  const t =
    locale === "zh"
      ? {
          minRead: "分钟阅读",
          defaultCategory: "随笔",
          statusLabel: "状态",
          statusValue: "阅读中 • 东京",
          backTitle: "动态",
          backSubtitle: "返回首页",
          publishedLabel: "发布时间",
          readingTimeLabel: "阅读时长",
          categoryLabel: "分类",
          locationLabel: "地点",
          dateLabel: "日期",
          readLabel: "阅读",
          authorLabel: "作者",
        }
      : {
          minRead: "min read",
          defaultCategory: "Journal",
          statusLabel: "Status",
          statusValue: "READING • TOKYO",
          backTitle: "Moments",
          backSubtitle: "Back to Feed",
          publishedLabel: "Published",
          readingTimeLabel: "Reading Time",
          categoryLabel: "Category",
          locationLabel: "Location",
          dateLabel: "Date",
          readLabel: "Read",
          authorLabel: "Author",
        };

  const post = await getPublicPost(locale, slug);

  if (!post) {
    notFound();
  }

  // Estimate reading time (~200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = `${Math.max(1, Math.ceil(wordCount / 200))} ${t.minRead}`;

  // Format the published date
  const publishedDate = post.publishedAt
    ? formatDate(post.publishedAt, locale)
    : formatDate(post.createdAt, locale);

  // Extract category from first tag or default
  const category =
    post.tags && post.tags.length > 0 ? post.tags[0] : t.defaultCategory;
  const alternateLocale: Locale = locale === "zh" ? "en" : "zh";
  const alternatePost = await getPublicPostByTranslationKey(
    alternateLocale,
    post.translationKey
  );
  const alternateHref = alternatePost
    ? toLocalizedPath(alternateLocale, `/posts/${alternatePost.slug}`)
    : null;

  return (
    <div className="min-h-screen bg-[#e8e8e6]">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 p-6 md:p-10">
        {alternateHref ? (
          <div className="mx-auto mb-4 flex max-w-[1400px] justify-end">
            <Link
              href={alternateHref}
              className="rounded-full border border-black/10 bg-white/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-[#555] transition-colors hover:border-black/20 hover:text-[#111]"
            >
              {alternateLocale === "zh" ? "切换中文" : "Switch EN"}
            </Link>
          </div>
        ) : null}

        <ArticlePaperDetail
          title={post.title}
          excerpt={post.excerpt || undefined}
          kicker={category}
          publishedDate={publishedDate}
          readingTime={readingTime}
          category={category}
          statusLabel={t.statusLabel}
          statusValue={t.statusValue}
          backTitle={t.backTitle}
          backSubtitle={t.backSubtitle}
          publishedLabel={t.publishedLabel}
          readingTimeLabel={t.readingTimeLabel}
          categoryLabel={t.categoryLabel}
          locationLabel={t.locationLabel}
          dateLabel={t.dateLabel}
          readLabel={t.readLabel}
          authorLabel={t.authorLabel}
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
