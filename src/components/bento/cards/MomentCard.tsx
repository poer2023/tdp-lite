import { cn, formatRelativeTime } from "@/lib/utils";
import { Moment } from "@/lib/schema";
import { MapPin, Quote } from "lucide-react";

interface MomentCardProps {
  moment: Moment;
  className?: string;
}

export function MomentCard({ moment, className }: MomentCardProps) {
  const hasMedia = moment.media && moment.media.length > 0;
  const mainMedia = hasMedia ? moment.media![0] : null;

  return (
    <div
      className={cn(
        "paper-card group relative flex h-full flex-col overflow-hidden",
        className
      )}
    >
      {hasMedia ? (
        <>
          <div className="absolute inset-0 z-0">
            <img
              src={mainMedia!.url}
              alt="Moment"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                Insight
              </span>
              {moment.location && (
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-md">
                  <MapPin className="h-3 w-3" />
                  {moment.location.name}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-display text-lg font-medium leading-relaxed text-white">
                "{moment.content}"
              </p>
              <div className="font-mono text-xs text-white/60">
                {formatRelativeTime(moment.createdAt, moment.locale)}
              </div>
            </div>
          </div>
        </>
      ) : (
        // Text-only moment
        <div className="flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Quote className="h-4 w-4" />
            </div>
            {moment.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {moment.location.name}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center">
            <p className="font-display text-lg font-medium leading-relaxed text-foreground">
              "{moment.content}"
            </p>
          </div>

          <div className="font-mono text-xs text-muted-foreground">
            {formatRelativeTime(moment.createdAt, moment.locale)}
          </div>
        </div>
      )}
    </div>
  );
}
