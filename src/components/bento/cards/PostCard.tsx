import Link from "next/link";
import { cn, formatRelativeTimeUppercase } from "@/lib/utils";
import { Post } from "@/lib/schema";
import { ArrowUpRight } from "lucide-react";

interface PostCardProps {
  post: Post;
  isHero?: boolean;
  className?: string;
}

export function PostCard({ post, isHero = false, className }: PostCardProps) {
  return (
    <Link
      href={`/${post.locale}/posts/${post.slug}`}
      className={cn(
        "paper-card group relative flex h-full flex-col overflow-hidden",
        className
      )}
    >
      {post.coverUrl ? (
        <div className="h-full w-full bg-white p-2 dark:bg-gray-900">
          {/* 内部图片容器，带圆角 */}
          <div className="relative h-full w-full overflow-hidden rounded-2xl">
            {/* 背景图片和渐变 */}
            <div className="absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl">
              <img
                src={post.coverUrl}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* 更浓的底部渐变 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between p-5">
              {/* 顶部：只有箭头按钮（右上角） */}
              <div className="flex items-start justify-end">
                <div className="rounded-full bg-white/90 p-2 text-gray-800 shadow-sm">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>

              {/* 底部内容区 */}
              <div className="space-y-3">
                {/* Featured 标签和时间在同一行 */}
                <div className="flex items-center gap-3">
                  {isHero && (
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">
                      Featured
                    </span>
                  )}
                  <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                    {formatRelativeTimeUppercase(post.publishedAt || post.createdAt, post.locale)}
                  </span>
                </div>
                <h3 className={cn(
                  "font-display font-bold leading-tight text-white",
                  isHero ? "text-3xl" : "text-xl"
                )}>
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className={cn(
                    "text-white/80",
                    isHero ? "text-base line-clamp-3" : "text-sm line-clamp-2"
                  )}>
                    {post.excerpt}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Text-only card (no cover image)
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Journal
              </span>
              <p className="font-mono text-xs text-muted-foreground">
                Read time: 5m
              </p>
            </div>
            <div className="rounded-full bg-gray-100 p-2 text-gray-500 opacity-0 transition-all group-hover:opacity-100 dark:bg-gray-800">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold leading-tight text-foreground">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {formatRelativeTimeUppercase(post.publishedAt || post.createdAt, post.locale)}
          </div>
        </div>
      )}
    </Link>
  );
}
