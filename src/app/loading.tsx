export default function Loading() {
  return (
    <div className="tdp-safe-surface bg-page-surface min-h-dvh">
      <div className="tdp-safe-noise bg-noise pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-multiply" />
      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-8 px-6 pb-12 pt-[calc(3rem+var(--tdp-inset-top))] md:px-12">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="bg-black/6 h-16 w-48 animate-pulse rounded-2xl md:h-24 md:w-80" />
            <div className="bg-black/6 h-5 w-full max-w-2xl animate-pulse rounded-full" />
            <div className="bg-black/6 h-5 w-3/4 max-w-xl animate-pulse rounded-full" />
          </div>
          <div className="bg-black/6 hidden size-12 animate-pulse rounded-full sm:block" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-[220px] animate-pulse rounded-[28px] border border-black/5 bg-white/70"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
