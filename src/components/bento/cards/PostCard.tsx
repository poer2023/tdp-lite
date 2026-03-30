import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/content/types";
import type { MediaKind } from "@/lib/media";
import { isVideoUrl } from "@/lib/media";
import { ArrowUpRight } from "lucide-react";
import { AutoplayCoverVideo } from "./AutoplayCoverVideo";
import {
  DeferredCardMediaPlaceholder,
  DeferredCardMediaSlot,
} from "./DeferredCardMediaSlot";
import {
  BENTO_CARD_MEDIA_SIZES,
  createOptimizedImageLoader,
} from "./mediaSizing";
import { resolveHomeImagePhaseItem } from "@/components/home/homeMediaPhases";
import { toLocalizedPath } from "@/lib/locale-routing";
import { RelativeTimeLabel } from "@/components/ui/RelativeTimeLabel";
import { shouldBypassNextImageOptimization } from "@/lib/mediaOptimization";

interface PostCardProps {
  post: Post;
  isHighlighted?: boolean;
  coverMediaType?: MediaKind;
  // Backward-compatible alias.
  isHero?: boolean;
  className?: string;
  preview?: boolean;
  priorityMedia?: boolean;
  deferMedia?: boolean;
  deferMediaDelayMs?: number;
  suspendDeferredMedia?: boolean;
  homeImagePhaseId?: string;
}

export function PostCard({
  post,
  isHighlighted,
  coverMediaType,
  isHero,
  className,
  preview = false,
  priorityMedia = false,
  deferMedia = false,
  deferMediaDelayMs,
  suspendDeferredMedia = false,
  homeImagePhaseId,
}: PostCardProps) {
  const isZh = post.locale === "zh";
  const highlighted = isHighlighted ?? isHero ?? false;
  const coverSrc = post.coverUrl || null;
  const hasVideoCover = Boolean(
    coverSrc &&
    (coverMediaType ? coverMediaType === "video" : isVideoUrl(coverSrc))
  );
  const skipOptimization =
    !hasVideoCover && shouldBypassNextImageOptimization(coverSrc);
  const coverImageLoader =
    coverSrc && !hasVideoCover && !skipOptimization
      ? createOptimizedImageLoader(undefined, 384)
      : undefined;
  const wrapperClass = cn(
    "paper-card group relative flex h-full flex-col overflow-hidden",
    highlighted && "ring-1 ring-black/15 shadow-highlight",
    preview ? "cursor-default" : "cursor-pointer",
    className
  );

  const content = coverSrc ? (
    <div className="h-full w-full bg-white p-1 dark:bg-gray-900 md:p-2">
      <div className="relative h-full w-full overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 z-0 h-full w-full overflow-hidden rounded-2xl"
          data-lg-media-source="post-card-media"
        >
          <DeferredCardMediaSlot
            deferred={deferMedia}
            delayMs={deferMediaDelayMs}
            suspended={suspendDeferredMedia}
            placeholder={<DeferredCardMediaPlaceholder variant="dark" />}
            homeImagePhaseId={homeImagePhaseId}
          >
            {hasVideoCover ? (
              <AutoplayCoverVideo
                src={coverSrc}
                eager={priorityMedia}
                suspended={suspendDeferredMedia}
                waitForHomeImagesReady={Boolean(homeImagePhaseId)}
                homeImagePhaseId={homeImagePhaseId}
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
                loader={coverImageLoader}
                sizes={BENTO_CARD_MEDIA_SIZES}
                loading={priorityMedia ? undefined : "lazy"}
                priority={priorityMedia}
                onLoad={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
                onError={() => resolveHomeImagePhaseItem(homeImagePhaseId)}
                className={cn(
                  "object-cover transition-transform duration-500",
                  !preview && "group-hover:scale-105"
                )}
              />
            )}
          </DeferredCardMediaSlot>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between p-3.5 md:p-5">
          <div className="flex items-start justify-end">
            <div className="rounded-full bg-white/90 p-1.5 text-gray-800 shadow-sm md:p-2">
              <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
          </div>

          <div className="space-y-1.5 md:space-y-3">
            <div className="flex items-center gap-2 md:gap-3">
              {highlighted && (
                <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white md:px-3 md:py-1 md:text-xs md:tracking-wider">
                  {isZh ? "精选" : "Featured"}
                </span>
              )}
              <RelativeTimeLabel
                date={post.publishedAt || post.createdAt}
                locale={post.locale}
                uppercase
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 md:text-xs md:tracking-wider"
              />
            </div>
            <h3 className="line-clamp-2 font-display text-[1.02rem] font-bold leading-[1.12] tracking-[-0.02em] text-white md:text-xl md:leading-tight md:tracking-normal">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="line-clamp-1 text-[12px] leading-[1.32] text-white/80 md:line-clamp-2 md:text-sm md:leading-normal">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col justify-between p-3.5 md:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300 md:px-3 md:py-1 md:text-xs">
            {post.tags && post.tags.length > 0
              ? post.tags[0]
              : isZh
                ? "随笔"
                : "Journal"}
          </span>
          <p className="font-mono text-[10px] text-muted-foreground md:text-xs">
            {isZh ? "阅读时长：" : "Read time: "}
            {Math.max(1, Math.ceil(post.content.length / 1000))}m
          </p>
        </div>
        <div
          className={cn(
            "rounded-full bg-gray-100 p-1.5 text-gray-500 transition-all dark:bg-gray-800 md:p-2",
            preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
      </div>

      <div className="space-y-1.5 md:space-y-2">
        {highlighted && (
          <span className="inline-flex rounded-full bg-black px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white md:py-1 md:tracking-wider">
            {isZh ? "精选" : "Featured"}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-[1.02rem] font-bold leading-[1.12] tracking-[-0.02em] text-foreground md:text-xl md:leading-tight md:tracking-normal">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-1 text-[12px] leading-[1.32] text-muted-foreground md:line-clamp-2 md:text-sm md:leading-normal">
            {post.excerpt}
          </p>
        )}
      </div>

      <RelativeTimeLabel
        date={post.publishedAt || post.createdAt}
        locale={post.locale}
        uppercase
        className="text-[10px] text-muted-foreground md:text-xs"
      />
    </div>
  );

  if (preview) {
    return <div className={wrapperClass}>{content}</div>;
  }

  return (
    <Link
      href={toLocalizedPath(post.locale, `/posts/${post.slug}`)}
      prefetch={false}
      className={wrapperClass}
    >
      {content}
    </Link>
  );
}
