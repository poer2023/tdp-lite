"use client";

import type { GalleryItem, Moment, Post } from "@/lib/schema";
import type { MediaKind } from "@/lib/media";
import { GalleryCard } from "@/components/bento/cards/GalleryCard";
import { MomentCard } from "@/components/bento/cards/MomentCard";
import { PostCard } from "@/components/bento/cards/PostCard";
import type { Tab } from "./types";

interface LivePreviewPanelProps {
  activeTab: Tab;
  momentPreview: Moment;
  postPreview: Post;
  postCoverMediaType: MediaKind | null;
  galleryPreview: GalleryItem;
  hasMomentInput: boolean;
  hasPostInput: boolean;
  hasGalleryInput: boolean;
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[#f7f7f5] p-6 text-center text-sm text-[#888]">
      {text}
    </div>
  );
}

export function LivePreviewPanel({
  activeTab,
  momentPreview,
  postPreview,
  postCoverMediaType,
  galleryPreview,
  hasMomentInput,
  hasPostInput,
  hasGalleryInput,
}: LivePreviewPanelProps) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
          Live Preview
        </p>
        <h2 className="text-lg font-semibold text-[#111]">Front-end Aligned Card</h2>
      </div>

      {activeTab === "moment" && (
        <div>
          {hasMomentInput ? (
            <div className="min-h-[220px]">
              <MomentCard moment={momentPreview} preview className="min-h-[220px]" />
            </div>
          ) : (
            <Placeholder text="Fill the moment form to preview exactly how it appears in feed cards." />
          )}
        </div>
      )}

      {activeTab === "post" && (
        <div>
          {hasPostInput ? (
            <div className="min-h-[220px]">
              <PostCard
                post={postPreview}
                preview
                coverMediaType={postCoverMediaType ?? undefined}
                className="min-h-[220px]"
              />
            </div>
          ) : (
            <Placeholder text="Write title/content to preview the post card before publishing." />
          )}
        </div>
      )}

      {activeTab === "gallery" && (
        <div>
          {hasGalleryInput ? (
            <div className="min-h-[220px]">
              <GalleryCard item={galleryPreview} preview className="min-h-[220px]" />
            </div>
          ) : (
            <Placeholder text="Select an image to preview gallery card style and overlay." />
          )}
        </div>
      )}
    </section>
  );
}
