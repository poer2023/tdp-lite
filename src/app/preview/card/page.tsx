import { GalleryCard } from "@/components/bento/cards/GalleryCard";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import { PostCard } from "@/components/bento/cards/PostCard";
import {
  BENTO_SPAN_CLASS,
  resolvePreferredBentoSpan,
} from "@/components/bento/layoutEngine";
import { loadPreviewPayloadFromApi } from "@/lib/previewApi";
import { cn } from "@/lib/utils";
import {
  inferPostCoverMediaType,
  toPreviewGallery,
  toPreviewMoment,
  toPreviewPost,
} from "@/lib/publish/previewMappers";

export const dynamic = "force-dynamic";

interface PreviewCardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-surface p-6 font-display">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm dark:border-white/14 dark:bg-[#2c3541]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#999]">
          预览不可用
        </p>
        <p className="mt-3 text-sm text-[#444]">{message}</p>
      </div>
    </div>
  );
}

export default async function PreviewCardPage({ searchParams }: PreviewCardPageProps) {
  const params = await searchParams;
  const resolved = await loadPreviewPayloadFromApi(params);

  if (!resolved.ok) {
    return <PreviewError message={resolved.reason} />;
  }

  const payload = resolved.payload;
  const previewItem =
    payload.kind === "moment"
      ? ({ type: "moment" as const, ...toPreviewMoment(payload.data) } as const)
      : payload.kind === "post"
        ? ({ type: "post" as const, ...toPreviewPost(payload.data) } as const)
        : ({ type: "gallery" as const, ...toPreviewGallery(payload.data) } as const);
  const previewSpanClass = BENTO_SPAN_CLASS[resolvePreferredBentoSpan(previewItem)];

  return (
    <div className="min-h-screen bg-page-surface p-6 font-display">
      <div className="mx-auto max-w-5xl">
        <div className="grid auto-rows-[220px] grid-cols-1 gap-6 md:grid-cols-3">
          <div className={cn("col-span-1", previewSpanClass)}>
            {payload.kind === "moment" ? (
              <MomentCard
                moment={toPreviewMoment(payload.data)}
                preview
                className="h-full min-h-[220px]"
              />
            ) : null}

            {payload.kind === "post" ? (
              <PostCard
                post={toPreviewPost(payload.data)}
                coverMediaType={inferPostCoverMediaType(payload.data)}
                preview
                className="h-full min-h-[220px]"
              />
            ) : null}

            {payload.kind === "gallery" ? (
              <GalleryCard
                item={toPreviewGallery(payload.data)}
                preview
                className="h-full min-h-[220px]"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
