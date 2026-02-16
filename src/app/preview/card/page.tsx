import { GalleryCard } from "@/components/bento/cards/GalleryCard";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import { PostCard } from "@/components/bento/cards/PostCard";
import { loadPreviewPayloadFromApi } from "@/lib/previewApi";
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
    <div className="flex min-h-screen items-center justify-center bg-[#e9e9e7] p-6 font-display">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#999]">
          Preview Unavailable
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

  return (
    <div className="min-h-screen bg-[#e9e9e7] p-6 font-display">
      <div className="mx-auto max-w-3xl">
        {payload.kind === "moment" ? (
          <MomentCard
            moment={toPreviewMoment(payload.data)}
            preview
            className="min-h-[460px]"
          />
        ) : null}

        {payload.kind === "post" ? (
          <PostCard
            post={toPreviewPost(payload.data)}
            coverMediaType={inferPostCoverMediaType(payload.data)}
            preview
            className="min-h-[460px]"
          />
        ) : null}

        {payload.kind === "gallery" ? (
          <GalleryCard
            item={toPreviewGallery(payload.data)}
            preview
            className="min-h-[460px]"
          />
        ) : null}
      </div>
    </div>
  );
}
