import { MomentDetailPage } from "@/components/content/MomentDetailPage";
import { PostDetailPage } from "@/components/content/PostDetailPage";
import { GalleryMomentDetail } from "@/components/stitch-details/GalleryMomentDetail";
import { loadPreviewPayloadFromApi } from "@/lib/previewApi";
import {
  toPreviewGallery,
  toPreviewMoment,
  toPreviewPost,
} from "@/lib/publish/previewMappers";
import { normalizeLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

interface PreviewDetailPageProps {
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

export default async function PreviewDetailPage({
  searchParams,
}: PreviewDetailPageProps) {
  const params = await searchParams;
  const resolved = await loadPreviewPayloadFromApi(params);

  if (!resolved.ok) {
    return <PreviewError message={resolved.reason} />;
  }

  const payload = resolved.payload;

  if (payload.kind === "post") {
    const post = toPreviewPost(payload.data);
    return (
      <PostDetailPage
        locale={normalizeLocale(post.locale)}
        post={post}
        hideLocaleToggle
      />
    );
  }

  if (payload.kind === "moment") {
    const moment = toPreviewMoment(payload.data);
    return (
      <MomentDetailPage
        locale={normalizeLocale(moment.locale)}
        moment={moment}
        hideLocaleToggle
      />
    );
  }

  const item = toPreviewGallery(payload.data);
  const src = item.thumbUrl || item.fileUrl;

  return (
    <div className="min-h-screen bg-page-surface p-6 font-display">
      <GalleryMomentDetail
        title={item.title || "相册预览"}
        author="预览"
        seriesLabel="草稿"
        paragraphs={[
          "这是由主站详情组件实时渲染的预览页面。",
          "你在发布台修改标题或媒体后，这里会接近实时更新。",
        ]}
        images={[
          {
            id: item.id,
            src,
            thumbSrc: item.thumbUrl || item.fileUrl,
            alt: item.title || "预览图片",
            width: item.width || undefined,
            height: item.height || undefined,
          },
        ]}
        showDock={false}
      />
    </div>
  );
}
