"use client";

import type { FormEvent } from "react";
import { Send, Upload } from "lucide-react";
import { DropdownSelect, type DropdownOption } from "@/components/ui/DropdownSelect";
import type {
  GalleryDraft,
  MomentDraft,
  PostDraft,
  Tab,
} from "./types";

interface ComposePanelProps {
  activeTab: Tab;
  isSubmitting: boolean;
  errors: Record<Tab, string | null>;
  momentDraft: MomentDraft;
  postDraft: PostDraft;
  galleryDraft: GalleryDraft;
  momentFileInputKey: number;
  postFileInputKey: number;
  galleryFileInputKey: number;
  onMomentDraftChange: (next: Partial<MomentDraft>) => void;
  onPostDraftChange: (next: Partial<PostDraft>) => void;
  onGalleryDraftChange: (next: Partial<GalleryDraft>) => void;
  onMomentImagesChange: (files: File[]) => void;
  onPostCoverChange: (file: File | null) => void;
  onGalleryImageChange: (file: File | null) => void;
  onPublishMoment: () => void;
  onSavePostDraft: () => void;
  onPublishPost: () => void;
  onPublishGallery: () => void;
}

function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}

const LOCALE_OPTIONS: Array<DropdownOption<"en" | "zh">> = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

const VISIBILITY_OPTIONS: Array<DropdownOption<"public" | "private">> = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const POST_STATUS_OPTIONS: Array<DropdownOption<"draft" | "published">> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export function ComposePanel({
  activeTab,
  isSubmitting,
  errors,
  momentDraft,
  postDraft,
  galleryDraft,
  momentFileInputKey,
  postFileInputKey,
  galleryFileInputKey,
  onMomentDraftChange,
  onPostDraftChange,
  onGalleryDraftChange,
  onMomentImagesChange,
  onPostCoverChange,
  onGalleryImageChange,
  onPublishMoment,
  onSavePostDraft,
  onPublishPost,
  onPublishGallery,
}: ComposePanelProps) {
  const handleMomentSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onPublishMoment();
  };

  const handlePostSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSavePostDraft();
  };

  const handleGallerySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onPublishGallery();
  };

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
          Compose
        </p>
        <h2 className="text-lg font-semibold text-[#111]">Publish Workspace</h2>
      </div>

      {activeTab === "moment" && (
        <form onSubmit={handleMomentSubmit} className="space-y-3">
          <textarea
            value={momentDraft.content}
            onChange={(e) => onMomentDraftChange({ content: e.target.value })}
            placeholder="Share a short moment"
            rows={5}
            className="w-full resize-none rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-[#666]">
              <span className="font-mono uppercase tracking-wider">Locale</span>
              <DropdownSelect
                value={momentDraft.locale}
                options={LOCALE_OPTIONS}
                onChange={(nextLocale) =>
                  onMomentDraftChange({ locale: nextLocale })
                }
              />
            </label>

            <label className="space-y-1 text-xs text-[#666]">
              <span className="font-mono uppercase tracking-wider">Visibility</span>
              <DropdownSelect
                value={momentDraft.visibility}
                options={VISIBILITY_OPTIONS}
                onChange={(nextVisibility) =>
                  onMomentDraftChange({ visibility: nextVisibility })
                }
              />
            </label>
          </div>

          <input
            value={momentDraft.locationName}
            onChange={(e) => onMomentDraftChange({ locationName: e.target.value })}
            placeholder="Location (optional)"
            className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs text-[#666] transition-colors hover:border-black/20">
              <Upload className="h-4 w-4" />
              Add media ({momentDraft.images.length})
              <input
                key={momentFileInputKey}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
                multiple
                className="hidden"
                onChange={(e) =>
                  onMomentImagesChange(Array.from(e.target.files || []))
                }
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Publish Moment
            </button>
          </div>

          <ErrorMessage message={errors.moment} />
        </form>
      )}

      {activeTab === "post" && (
        <form onSubmit={handlePostSubmit} className="space-y-3">
          <input
            value={postDraft.title}
            onChange={(e) => onPostDraftChange({ title: e.target.value })}
            placeholder="Post title"
            className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <textarea
            value={postDraft.content}
            onChange={(e) => onPostDraftChange({ content: e.target.value })}
            placeholder="Write your post content (Markdown supported)"
            rows={8}
            className="w-full resize-none rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <input
            value={postDraft.excerpt}
            onChange={(e) => onPostDraftChange({ excerpt: e.target.value })}
            placeholder="Excerpt (optional)"
            className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <input
            value={postDraft.tags}
            onChange={(e) => onPostDraftChange({ tags: e.target.value })}
            placeholder="Tags (comma separated)"
            className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-[#666]">
              <span className="font-mono uppercase tracking-wider">Locale</span>
              <DropdownSelect
                value={postDraft.locale}
                options={LOCALE_OPTIONS}
                onChange={(nextLocale) =>
                  onPostDraftChange({ locale: nextLocale })
                }
              />
            </label>

            <label className="space-y-1 text-xs text-[#666]">
              <span className="font-mono uppercase tracking-wider">Status</span>
              <DropdownSelect
                value={postDraft.status}
                options={POST_STATUS_OPTIONS}
                onChange={(nextStatus) =>
                  onPostDraftChange({ status: nextStatus })
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-xs text-[#666] transition-colors hover:border-black/20">
              <Upload className="h-4 w-4" />
              {postDraft.cover
                ? `Cover: ${postDraft.cover.name}`
                : "Add cover (image/video)"}
              <input
                key={postFileInputKey}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
                className="hidden"
                onChange={(e) =>
                  onPostCoverChange(e.target.files?.[0] || null)
                }
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#333] transition-colors hover:border-black/20 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={onPublishPost}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Publish Now
              </button>
            </div>
          </div>

          <ErrorMessage message={errors.post} />
        </form>
      )}

      {activeTab === "gallery" && (
        <form onSubmit={handleGallerySubmit} className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/10 bg-[#f4f4f2] px-4 py-8 text-sm text-[#666] transition-colors hover:border-black/20">
            <Upload className="h-5 w-5" />
            {galleryDraft.image ? galleryDraft.image.name : "Select image"}
            <input
              key={galleryFileInputKey}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                onGalleryImageChange(e.target.files?.[0] || null)
              }
            />
          </label>

          <input
            value={galleryDraft.title}
            onChange={(e) => onGalleryDraftChange({ title: e.target.value })}
            placeholder="Title (optional)"
            className="w-full rounded-xl border border-black/10 bg-[#f4f4f2] px-4 py-3 text-sm text-[#111] placeholder-[#999] focus:border-black/20 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Publish Photo
          </button>

          <ErrorMessage message={errors.gallery} />
        </form>
      )}
    </section>
  );
}
