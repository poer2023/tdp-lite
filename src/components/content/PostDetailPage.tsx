import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BottomNav } from "@/components/BottomNav";
import { ArticlePaperDetail } from "@/components/stitch-details/ArticlePaperDetail";
import type { Post } from "@/lib/content/types";
import type { AppLocale } from "@/lib/locale";
import { formatDate } from "@/lib/utils";
import { SITE_AVATAR_SRC } from "@/lib/branding";

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
          avatarSrc={SITE_AVATAR_SRC}
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
