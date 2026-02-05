import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Post } from "@/lib/schema";
import { ArrowUpRight, Clock } from "lucide-react";

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
        <>
          <div className="absolute inset-0 z-0 h-full w-full">
            <img
              src={post.coverUrl}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                {isHero ? "Featured" : "Article"}
              </span>
              <div className="rounded-full bg-white/20 p-2 text-white opacity-0 transition-all group-hover:opacity-100 backdrop-blur-md">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(post.publishedAt || post.createdAt, post.locale)}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <span className="font-mono uppercase">{post.tags[0]}</span>
                )}
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
        </>
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
            {formatRelativeTime(post.publishedAt || post.createdAt, post.locale)}
          </div>
        </div>
      )}
    </Link>
  );
}
