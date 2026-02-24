import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticlePaperDetail } from "@/components/stitch-details/ArticlePaperDetail";
import { GalleryMomentDetail } from "@/components/stitch-details/GalleryMomentDetail";
import { MomentDetailCard } from "@/components/bento/cards/MomentDetailCard";
import { TextMomentDetailCard } from "@/components/bento/cards/TextMomentDetailCard";
import { loadPreviewPayloadFromApi } from "@/lib/previewApi";
import {
  toPreviewGallery,
  toPreviewMoment,
  toPreviewPost,
} from "@/lib/publish/previewMappers";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PreviewDetailPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-surface p-6 font-display">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm dark:border-white/14 dark:bg-[#2c3541]">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#999]">
          Preview Unavailable
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
    const postTags = post.tags ?? [];
    return (
      <div className="min-h-screen bg-page-surface p-6">
        <ArticlePaperDetail
          title={post.title}
          excerpt={post.excerpt || undefined}
          kicker={postTags[0] || "Reflections"}
          category={postTags[0] || "Journal"}
          readingTime={`${Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min read`}
          publishedDate={formatDate(post.publishedAt || post.createdAt, post.locale)}
          content={
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          }
          showDock={false}
        />
      </div>
    );
  }

  if (payload.kind === "moment") {
    const moment = toPreviewMoment(payload.data);
    const hasMedia = (moment.media ?? []).length > 0;
    return (
      <div className="min-h-screen bg-page-surface p-6 font-display">
        <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          {hasMedia ? (
            <MomentDetailCard moment={moment} />
          ) : (
            <TextMomentDetailCard moment={moment} />
          )}
        </div>
      </div>
    );
  }

  const item = toPreviewGallery(payload.data);
  const src = item.thumbUrl || item.fileUrl;

  return (
    <div className="min-h-screen bg-page-surface p-6 font-display">
      <GalleryMomentDetail
        title={item.title || "Gallery Preview"}
        author="Preview"
        seriesLabel="Draft"
        paragraphs={[
          "This is a live detail preview rendered by the main site component.",
          "Adjust title or media in publisher and the layout updates in near real time.",
        ]}
        images={[
          {
            id: item.id,
            src,
            thumbSrc: item.thumbUrl || item.fileUrl,
            alt: item.title || "Preview image",
            width: item.width || undefined,
            height: item.height || undefined,
          },
        ]}
        showDock={false}
      />
    </div>
  );
}
