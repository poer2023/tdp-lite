import { cn } from "@/lib/utils";
import searchStyles from "@/components/search/search-page.module.css";
import aboutStyles from "@/app/[locale]/about/about.module.css";
import { RouteTransitionMarker } from "./RouteTransitionMarker";

function PulseBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-[1.75rem] bg-black/6", className)} />;
}

export function HomeRouteLoadingSurface() {
  return (
    <div
      className="text-ink bg-page-surface relative min-h-screen overflow-x-hidden pb-32 font-display"
      data-route-kind="loading"
      data-route-surface="home"
    >
      <RouteTransitionMarker kind="loading" surface="home" />
      <div
        className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-40 mix-blend-multiply"
        data-lg-bg-layer="home-noise"
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 md:px-12">
        <div className="mb-14 flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1 space-y-4 px-2">
            <PulseBlock className="h-20 w-52 rounded-[2.25rem] md:h-24 md:w-80" />
            <PulseBlock className="h-6 w-full max-w-2xl rounded-full" />
            <PulseBlock className="h-6 w-3/4 max-w-xl rounded-full" />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-6">
              <div className="hidden space-y-2 sm:block">
                <PulseBlock className="h-3 w-20 rounded-full" />
                <PulseBlock className="h-4 w-28 rounded-full" />
              </div>
              <PulseBlock className="size-12 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <PulseBlock
              key={index}
              className={cn(
                "border border-black/5 bg-white/70",
                index % 5 === 0
                  ? "h-[260px] md:col-span-2"
                  : index % 3 === 0
                    ? "h-[260px]"
                    : "h-[220px]"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SearchRouteLoadingSurface() {
  return (
    <div
      className={cn(
        searchStyles.root,
        "relative min-h-screen overflow-hidden pb-32 font-display"
      )}
      data-route-kind="loading"
      data-route-surface="search"
    >
      <RouteTransitionMarker kind="loading" surface="search" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(242,242,240,0))]" />
      <div className="relative z-10 mx-auto flex max-w-[1320px] flex-col gap-8 px-6 py-12 md:px-12">
        <div className="space-y-4">
          <PulseBlock className="h-4 w-24 rounded-full" />
          <PulseBlock className="h-20 w-full rounded-[2rem]" />
        </div>

        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <PulseBlock key={index} className="h-10 w-24 rounded-full" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PulseBlock
              key={index}
              className={cn(
                "border border-black/5 bg-white/70",
                index === 0 ? "h-[260px] md:col-span-2" : "h-[220px]"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AboutRouteLoadingSurface() {
  return (
    <div
      className={cn(
        aboutStyles.root,
        "relative min-h-screen overflow-hidden pb-32 font-display"
      )}
      data-route-kind="loading"
      data-route-surface="about"
    >
      <RouteTransitionMarker kind="loading" surface="about" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.58),rgba(248,248,247,0))]" />
      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-12 md:px-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <PulseBlock className="h-16 w-56 rounded-[2rem] md:h-20 md:w-72" />
            <PulseBlock className="h-16 w-64 rounded-[2rem] md:h-20 md:w-80" />
            <PulseBlock className="h-5 w-full max-w-2xl rounded-full" />
            <PulseBlock className="h-5 w-2/3 rounded-full" />
            <div className="flex gap-3 pt-2">
              <PulseBlock className="h-10 w-28 rounded-full" />
              <PulseBlock className="h-10 w-28 rounded-full" />
            </div>
          </div>
          <PulseBlock className="min-h-[240px] rounded-[2.5rem]" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <PulseBlock className="min-h-[280px] rounded-[2.5rem]" />
          <PulseBlock className="min-h-[280px] rounded-[2.5rem]" />
          <PulseBlock className="min-h-[280px] rounded-[2.5rem]" />
        </div>
      </div>
    </div>
  );
}
