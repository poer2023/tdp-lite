"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { FileText, Layers, LogOut, MessageCircle } from "lucide-react";
import { createMoment, createPost } from "@/lib/actions";
import { inferMediaKindFromFile } from "@/lib/media";
import { isMomentPublishable } from "@/lib/momentValidation";
import { ComposePanel } from "./components/ComposePanel";
import { LivePreviewPanel } from "./components/LivePreviewPanel";
import {
  defaultMomentDraft,
  defaultPostDraft,
  type MomentDraft,
  type PostDraft,
  type Tab,
} from "./components/types";
import { mapMomentDraftToPreview, mapPostDraftToPreview } from "./components/previewMappers";

interface AdminDashboardProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  return url;
}

function useObjectUrls(files: File[]) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(
    () => () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    },
    [urls]
  );

  return urls;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("moment");
  const [submittingTab, setSubmittingTab] = useState<Tab | null>(null);

  const [momentDraft, setMomentDraft] = useState<MomentDraft>(defaultMomentDraft);
  const [postDraft, setPostDraft] = useState<PostDraft>(defaultPostDraft);

  const [momentFileInputKey, setMomentFileInputKey] = useState(0);
  const [postFileInputKey, setPostFileInputKey] = useState(0);

  const [errors, setErrors] = useState<Record<Tab, string | null>>({
    moment: null,
    post: null,
    gallery: null,
  });

  const isSubmitting = submittingTab !== null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "moment", label: "Moment", icon: <MessageCircle className="h-4 w-4" /> },
    { id: "post", label: "Post", icon: <FileText className="h-4 w-4" /> },
  ];

  const momentPreviewUrls = useObjectUrls(momentDraft.images);
  const postCoverPreviewUrl = useObjectUrl(postDraft.cover);
  const postCoverMediaType = useMemo(
    () => inferMediaKindFromFile(postDraft.cover),
    [postDraft.cover]
  );

  const momentPreview = useMemo(
    () => mapMomentDraftToPreview(momentDraft, momentPreviewUrls),
    [momentDraft, momentPreviewUrls]
  );

  const postPreview = useMemo(
    () => mapPostDraftToPreview(postDraft, postCoverPreviewUrl),
    [postDraft, postCoverPreviewUrl]
  );

  const hasMomentInput = Boolean(
    momentDraft.content.trim() ||
      momentDraft.locationName.trim() ||
      momentPreviewUrls.length
  );

  const hasPostInput = Boolean(
    postDraft.title.trim() ||
      postDraft.content.trim() ||
      postDraft.excerpt.trim() ||
      postDraft.tags.trim() ||
      postCoverPreviewUrl
  );

  const updateError = (tab: Tab, message: string | null) => {
    setErrors((prev) => ({ ...prev, [tab]: message }));
  };

  const handlePublishMoment = async () => {
    if (isSubmitting) return;

    if (!isMomentPublishable(momentDraft.content, momentDraft.images.length)) {
      updateError("moment", "Moment content or media is required.");
      return;
    }

    updateError("moment", null);
    setSubmittingTab("moment");

    try {
      const formData = new FormData();
      formData.set("content", momentDraft.content.trim());
      formData.set("locale", momentDraft.locale);
      formData.set("visibility", momentDraft.visibility);
      if (momentDraft.locationName.trim()) {
        formData.set("locationName", momentDraft.locationName.trim());
      }
      momentDraft.images.forEach((file) => formData.append("images", file));

      await createMoment(formData);
      setMomentDraft(defaultMomentDraft);
      setMomentFileInputKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to publish moment:", error);
      updateError("moment", "Failed to publish moment. Please retry.");
    } finally {
      setSubmittingTab(null);
    }
  };

  const submitPost = async (status: "draft" | "published") => {
    if (isSubmitting) return;

    if (!postDraft.title.trim()) {
      updateError("post", "Post title is required.");
      return;
    }
    if (!postDraft.content.trim()) {
      updateError("post", "Post content is required.");
      return;
    }

    updateError("post", null);
    setSubmittingTab("post");

    try {
      const formData = new FormData();
      formData.set("title", postDraft.title.trim());
      formData.set("content", postDraft.content.trim());
      formData.set("locale", postDraft.locale);
      formData.set("status", status);
      if (postDraft.excerpt.trim()) {
        formData.set("excerpt", postDraft.excerpt.trim());
      }
      if (postDraft.tags.trim()) {
        formData.set("tags", postDraft.tags.trim());
      }
      if (postDraft.cover) {
        formData.set("cover", postDraft.cover);
      }

      await createPost(formData);
      setPostDraft(defaultPostDraft);
      setPostFileInputKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to save post:", error);
      updateError("post", "Failed to save post. Please retry.");
    } finally {
      setSubmittingTab(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#e9e9e7] font-display">
      <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-30 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-black/5 bg-[#f4f4f2] shadow-sm">
              <Layers className="h-5 w-5 text-[#111]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#111]">Admin Workspace</h1>
              <p className="font-mono text-[10px] text-[#666]">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#666] transition-colors hover:border-black/20 hover:text-[#111]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <div className="mb-6 flex gap-1 rounded-xl border border-black/5 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#111] text-white shadow-sm"
                  : "text-[#666] hover:bg-black/5 hover:text-[#111]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ComposePanel
            activeTab={activeTab}
            isSubmitting={isSubmitting}
            errors={errors}
            momentDraft={momentDraft}
            postDraft={postDraft}
            momentFileInputKey={momentFileInputKey}
            postFileInputKey={postFileInputKey}
            onMomentDraftChange={(next) =>
              setMomentDraft((prev) => ({ ...prev, ...next }))
            }
            onPostDraftChange={(next) =>
              setPostDraft((prev) => ({ ...prev, ...next }))
            }
            onMomentImagesChange={(files) =>
              setMomentDraft((prev) => ({ ...prev, images: files }))
            }
            onPostCoverChange={(file) =>
              setPostDraft((prev) => ({ ...prev, cover: file }))
            }
            onPublishMoment={handlePublishMoment}
            onSavePostDraft={() => {
              setPostDraft((prev) => ({ ...prev, status: "draft" }));
              submitPost("draft");
            }}
            onPublishPost={() => {
              setPostDraft((prev) => ({ ...prev, status: "published" }));
              submitPost("published");
            }}
          />

          <LivePreviewPanel
            activeTab={activeTab}
            momentPreview={momentPreview}
            postPreview={postPreview}
            postCoverMediaType={postCoverMediaType}
            hasMomentInput={hasMomentInput}
            hasPostInput={hasPostInput}
          />
        </div>
      </div>
    </div>
  );
}
