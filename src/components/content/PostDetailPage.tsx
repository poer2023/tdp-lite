import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BottomNav } from "@/components/BottomNav";
import { ArticlePaperDetail } from "@/components/stitch-details/ArticlePaperDetail";
import type { Post } from "@/lib/content/types";
import type { AppLocale } from "@/lib/locale";
import { formatDate } from "@/lib/utils";

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBy47viAR_LjhRiYmNAvIcG2Sls2o3grioez7j8CegtDxl-vr2YIA6NnC0g9i36Zj2EPGb3DhzFZQI9DN9jY-kQ-gx1cbrC3OQAvN5s-MC-vkWWti4cA6TwsHXT32V_DZqi8fVqx40OS-BMgP0jvEl4_AAjbkI81JzhVEV8O_GEXKaTfGE1k46yqh_-Z8SAut64Kiied5kkt_8yOLpFf_uUEtfh-YL2Am5CO3lsNWxbIt39Mg1DmLaQ0vnJDei6dbS28mrXzQQndzO1";

interface PostDetailPageProps {
  locale: AppLocale;
  post: Post;
  hideLocaleToggle?: boolean;
}

export function PostDetailPage({
  locale,
  post,
  hideLocaleToggle = false,
}: PostDetailPageProps) {
  const isZh = locale === "zh";
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = isZh
    ? `${Math.max(1, Math.ceil(wordCount / 200))} 分钟阅读`
    : `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
  const publishedDate = post.publishedAt
    ? formatDate(post.publishedAt, locale)
    : formatDate(post.createdAt, locale);
  const category = post.tags && post.tags.length > 0 ? post.tags[0] : isZh ? "随笔" : "Journal";

  return (
    <div className="min-h-screen bg-page-surface">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply" />
      <div className="relative z-10 p-6 pb-32 md:p-10 md:pb-36">
        <ArticlePaperDetail
          title={post.title}
          excerpt={post.excerpt || undefined}
          kicker={category}
          publishedDate={publishedDate}
          readingTime={readingTime}
          category={category}
          backHref={`/${locale}`}
          showDock={false}
          avatarSrc={DEFAULT_AVATAR}
          backTitle={isZh ? "文章" : undefined}
          backSubtitle={isZh ? "返回首页" : undefined}
          publishedLabel={isZh ? "发布时间" : undefined}
          readingTimeLabel={isZh ? "阅读时长" : undefined}
          categoryLabel={isZh ? "分类" : undefined}
          locationLabel={isZh ? "地点" : undefined}
          dateLabel={isZh ? "日期" : undefined}
          readLabel={isZh ? "阅读" : undefined}
          authorLabel={isZh ? "作者" : undefined}
          content={
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          }
        />
      </div>
      <BottomNav locale={locale} activeTab="home" hideLocaleToggle={hideLocaleToggle} />
    </div>
  );
}
