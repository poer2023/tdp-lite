import Link from "next/link";
import Image from "next/image";
import { cn, formatRelativeTimeUppercase } from "@/lib/utils";
import { Post } from "@/lib/schema";
import type { MediaKind } from "@/lib/media";
import { isVideoUrl } from "@/lib/media";
import { ArrowUpRight } from "lucide-react";
import { AutoplayCoverVideo } from "./AutoplayCoverVideo";
import { toLocalizedPath } from "@/lib/locale-routing";

interface PostCardProps {
  post: Post;
  isHighlighted?: boolean;
  coverMediaType?: MediaKind;
  // Backward-compatible alias.
  isHero?: boolean;
  className?: string;
  preview?: boolean;
}

export function PostCard({
  post,
  isHighlighted,
  coverMediaType,
  isHero,
  className,
  preview = false,
}: PostCardProps) {
  const highlighted = isHighlighted ?? isHero ?? false;
  const coverSrc = post.coverUrl || null;
  const hasVideoCover = Boolean(
    coverSrc &&
      (coverMediaType ? coverMediaType === "video" : isVideoUrl(coverSrc))
  );
  const skipOptimization =
    !hasVideoCover &&
    (coverSrc?.startsWith("blob:") || coverSrc?.startsWith("data:"));
  const wrapperClass = cn(
    "paper-card group relative flex h-full flex-col overflow-hidden",
    highlighted && "ring-1 ring-black/15 shadow-[0_10px_26px_-12px_rgba(0,0,0,0.28)]",
    preview ? "cursor-default" : "cursor-pointer",
    className
  );

  const content = coverSrc ? (
    <div className="h-full w-full bg-white p-2 dark:bg-gray-900">
      <div className="relative h-full w-full overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl"
          data-lg-media-source="post-card-media"
        >
          {hasVideoCover ? (
            <AutoplayCoverVideo
              src={coverSrc}
              className={cn(
                "transition-transform duration-500",
                !preview && "group-hover:scale-105"
              )}
            />
          ) : (
            <Image
              src={coverSrc}
              alt={post.title}
              fill
              unoptimized={Boolean(skipOptimization)}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className={cn(
                "object-cover transition-transform duration-500",
                !preview && "group-hover:scale-105"
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-end">
            <div className="rounded-full bg-white/90 p-2 text-gray-800 shadow-sm">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {highlighted && (
                <span className="rounded-full bg-black px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">
                  Featured
                </span>
              )}
              <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                {formatRelativeTimeUppercase(
                  post.publishedAt || post.createdAt,
                  post.locale
                )}
              </span>
            </div>
            <h3
              className="font-display text-xl font-bold leading-tight text-white"
            >
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="line-clamp-2 text-sm text-white/80">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Journal
          </span>
          <p className="font-mono text-xs text-muted-foreground">Read time: 5m</p>
        </div>
        <div
          className={cn(
            "rounded-full bg-gray-100 p-2 text-gray-500 transition-all dark:bg-gray-800",
            preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-2">
        {highlighted && (
          <span className="inline-flex rounded-full bg-black px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
            Featured
          </span>
        )}
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
  );

  if (preview) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link href={toLocalizedPath(post.locale, `/posts/${post.slug}`)} className={wrapperClass}>
      {content}
    </Link>
  );
}
