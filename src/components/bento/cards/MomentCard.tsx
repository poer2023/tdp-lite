import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Moment } from "@/lib/schema";
import { isVideoUrl } from "@/lib/media";
import { MapPin, Music2, Quote } from "lucide-react";
import { AutoplayCoverVideo } from "./AutoplayCoverVideo";
import { MomentImageOnly } from "./MomentImageOnly";
import { toLocalizedPath } from "@/lib/locale-routing";

interface MomentCardProps {
  moment: Moment;
  isHighlighted?: boolean;
  className?: string;
  preview?: boolean;
  onOpenPreview?: () => void;
}

export function MomentCard({
  moment,
  isHighlighted = false,
  className,
  preview = false,
  onOpenPreview,
}: MomentCardProps) {
  const hasMedia = moment.media && moment.media.length > 0;
  const mainMedia = hasMedia ? moment.media![0] : null;
  const isAudioMedia = Boolean(mainMedia?.type === "audio");
  const hasVideoMedia = Boolean(
    mainMedia && !isAudioMedia && (mainMedia.type === "video" || isVideoUrl(mainMedia.url))
  );
  const skipOptimization =
    !hasVideoMedia &&
    (mainMedia?.url.startsWith("blob:") || mainMedia?.url.startsWith("data:"));
  const wrapperClass = cn(
    "paper-card group relative flex h-full w-full flex-col overflow-hidden",
    isHighlighted && "ring-1 ring-black/15 shadow-[0_10px_26px_-12px_rgba(0,0,0,0.28)]",
    preview ? "cursor-default" : "cursor-pointer",
    className
  );

  const content = hasMedia ? (
    <>
      <div className="absolute inset-0 z-0" data-lg-media-source="moment-card-media">
        {isAudioMedia ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111] via-[#1f2937] to-[#111827]">
            <div className="flex flex-col items-center gap-3 text-white/90">
              <span className="lg-chip-dark inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                <Music2 className="h-3.5 w-3.5" />
                Music
              </span>
              <p className="font-display text-lg font-medium text-white">
                {mainMedia?.title || moment.content}
              </p>
              {mainMedia?.artist ? (
                <p className="font-mono text-xs text-white/70">{mainMedia.artist}</p>
              ) : null}
            </div>
          </div>
        ) : hasVideoMedia ? (
          <AutoplayCoverVideo
            src={mainMedia!.url}
            poster={mainMedia?.thumbnailUrl}
            className={cn(
              "transition-transform duration-500",
              !preview && "group-hover:scale-105"
            )}
          />
        ) : (
          <MomentImageOnly
            src={mainMedia!.url}
            alt="Moment"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            unoptimized={Boolean(skipOptimization)}
            preview={preview}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <span className="lg-chip-dark inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
            {isHighlighted ? "Spotlight" : "Insight"}
          </span>
          {moment.location && (
            <span className="lg-chip-dark flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
              <MapPin className="h-3 w-3" />
              {moment.location.name}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-display text-lg font-medium leading-relaxed text-white">
            &ldquo;{isAudioMedia ? mainMedia?.title || moment.content : moment.content}&rdquo;
          </p>
          {isAudioMedia && mainMedia?.artist ? (
            <div className="font-mono text-xs text-white/70">{mainMedia.artist}</div>
          ) : null}
          <div className="font-mono text-xs text-white/60">
            {formatRelativeTime(moment.createdAt, moment.locale)}
          </div>
        </div>
      </div>
    </>
  ) : (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          <Quote className="h-4 w-4" />
        </div>
        {isHighlighted && (
          <span className="rounded-full bg-black px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
            Spotlight
          </span>
        )}
        {moment.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {moment.location.name}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center">
        <p className="font-display text-lg font-medium leading-relaxed text-foreground">
          &ldquo;{isAudioMedia ? mainMedia?.title || moment.content : moment.content}&rdquo;
        </p>
      </div>

      <div className="font-mono text-xs text-muted-foreground">
        {formatRelativeTime(moment.createdAt, moment.locale)}
      </div>
    </div>
  );

  if (preview) {
    return <div className={wrapperClass}>{content}</div>;
  }

  if (onOpenPreview) {
    return (
      <button type="button" className={cn(wrapperClass, "text-left")} onClick={onOpenPreview}>
        {content}
      </button>
    );
  }

  return (
    <Link href={toLocalizedPath(moment.locale, `/moments/${moment.id}`)} className={wrapperClass}>
      {content}
    </Link>
  );
}
