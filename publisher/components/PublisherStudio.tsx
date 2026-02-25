"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MediaUploadResponse,
  PreviewDraftPayload,
  PreviewSessionResponse,
  PublishResult,
  PublisherTab,
} from "@/lib/contracts";

const STORAGE_KEY = "tdp-publisher:drafts:v1";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DeviceMode = "desktop" | "mobile";
type PreviewMode = "card" | "detail";

type MomentDraft = {
  content: string;
  locale: "en" | "zh";
  visibility: "public" | "private";
  locationName: string;
  media: Array<{
    type: "image" | "video";
    url: string;
    thumbnailUrl?: string;
  }>;
};

type PostDraft = {
  title: string;
  content: string;
  excerpt: string;
  tags: string;
  locale: "en" | "zh";
  status: "draft" | "published";
  coverUrl: string;
};

type GalleryDraft = {
  locale: "en" | "zh";
  title: string;
  fileUrl: string;
  thumbUrl: string;
};

type DraftState = {
  tab: PublisherTab;
  moment: MomentDraft;
  post: PostDraft;
  gallery: GalleryDraft;
};

const defaultMomentDraft: MomentDraft = {
  content: "",
  locale: "en",
  visibility: "public",
  locationName: "",
  media: [],
};

const defaultPostDraft: PostDraft = {
  title: "",
  content: "",
  excerpt: "",
  tags: "",
  locale: "en",
  status: "draft",
  coverUrl: "",
};

const defaultGalleryDraft: GalleryDraft = {
  locale: "en",
  title: "",
  fileUrl: "",
  thumbUrl: "",
};

const defaultDraftState: DraftState = {
  tab: "moment",
  moment: defaultMomentDraft,
  post: defaultPostDraft,
  gallery: defaultGalleryDraft,
};

function parseStoredDraft(value: string | null): DraftState {
  if (!value) return defaultDraftState;

  try {
    const parsed = JSON.parse(value) as {
      updatedAt?: number;
      data?: DraftState;
    };

    if (!parsed.updatedAt || !parsed.data) {
      return defaultDraftState;
    }

    if (Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
      return defaultDraftState;
    }

    return {
      tab: parsed.data.tab || "moment",
      moment: {
        ...defaultMomentDraft,
        ...parsed.data.moment,
      },
      post: {
        ...defaultPostDraft,
        ...parsed.data.post,
      },
      gallery: {
        ...defaultGalleryDraft,
        ...parsed.data.gallery,
      },
    };
  } catch {
    return defaultDraftState;
  }
}

function toPayload(draft: DraftState): PreviewDraftPayload {
  if (draft.tab === "moment") {
    return {
      kind: "moment",
      data: {
        content: draft.moment.content,
        locale: draft.moment.locale,
        visibility: draft.moment.visibility,
        locationName: draft.moment.locationName.trim() || undefined,
        media: draft.moment.media,
      },
    };
  }

  if (draft.tab === "post") {
    const tags = draft.post.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      kind: "post",
      data: {
        title: draft.post.title,
        content: draft.post.content,
        excerpt: draft.post.excerpt.trim() || undefined,
        locale: draft.post.locale,
        tags,
        status: draft.post.status,
        coverUrl: draft.post.coverUrl.trim() || undefined,
      },
    };
  }

  return {
    kind: "gallery",
    data: {
      locale: draft.gallery.locale,
      title: draft.gallery.title.trim() || undefined,
      fileUrl: draft.gallery.fileUrl,
      thumbUrl: draft.gallery.thumbUrl.trim() || undefined,
    },
  };
}

function payloadHasContent(payload: PreviewDraftPayload): boolean {
  if (payload.kind === "moment") {
    return payload.data.content.trim().length > 0 || payload.data.media.length > 0;
  }

  if (payload.kind === "post") {
    return (
      payload.data.title.trim().length > 0 || payload.data.content.trim().length > 0
    );
  }

  return payload.data.fileUrl.trim().length > 0;
}

function payloadReadyForPublish(payload: PreviewDraftPayload): boolean {
  if (payload.kind === "moment") {
    return payload.data.content.trim().length > 0;
  }
  if (payload.kind === "post") {
    return (
      payload.data.title.trim().length > 0 && payload.data.content.trim().length > 0
    );
  }
  return payload.data.fileUrl.trim().length > 0;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | { error?: string }) : {};

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? payload.error || `Request failed: ${response.status}`
        : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

type ChoiceOption<T extends string> = { value: T; label: string };

function ChoiceGroup<T extends string>(props: {
  value: T;
  options: Array<ChoiceOption<T>>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="choice-group" role="group">
      {props.options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={props.value === option.value ? "choice active" : "choice"}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PublisherStudio() {
  const [draft, setDraft] = useState<DraftState>(() =>
    parseStoredDraft(
      typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY)
    )
  );

  const [previewMode, setPreviewMode] = useState<PreviewMode>("card");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const sessionIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<PreviewSessionResponse | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>("Waiting for input...");
  const [isSyncingPreview, setIsSyncingPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPublishResult, setLastPublishResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        data: draft,
      })
    );
  }, [draft]);

  const payload = useMemo(() => toPayload(draft), [draft]);

  useEffect(() => {
    if (!payloadHasContent(payload)) {
      setPreview(null);
      setPreviewMessage("Waiting for input...");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSyncingPreview(true);
      setError(null);

      try {
        const response = await fetch("/api/publish/preview-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current || undefined,
            payload,
          }),
          signal: controller.signal,
        });

        const next = await parseJsonResponse<PreviewSessionResponse>(response);
        sessionIdRef.current = next.sessionId;
        setPreview(next);
        setPreviewMessage("Preview synced");
      } catch (syncError) {
        if (!controller.signal.aborted) {
          const message =
            syncError instanceof Error ? syncError.message : "Failed to sync preview";
          setError(message);
          setPreviewMessage("Preview failed, please retry");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSyncingPreview(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [payload]);

  const handleUpload = async (file: File, field: string) => {
    setUploadingField(field);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/publish/media", {
        method: "POST",
        body: formData,
      });

      return await parseJsonResponse<MediaUploadResponse>(response);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    setLastPublishResult(null);

    try {
      const response = await fetch("/api/publish/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payload,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const published = await parseJsonResponse<PublishResult>(response);
      setLastPublishResult(published);
      sessionIdRef.current = null;
      setPreview(null);
      setPreviewMessage("Published. Start a new draft.");

      setDraft((prev) => {
        if (prev.tab === "moment") {
          return { ...prev, moment: defaultMomentDraft };
        }
        if (prev.tab === "post") {
          return { ...prev, post: defaultPostDraft };
        }
        return { ...prev, gallery: defaultGalleryDraft };
      });
    } catch (publishError) {
      const message =
        publishError instanceof Error ? publishError.message : "Publish failed";
      setError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const activePreviewUrl =
    previewMode === "card" ? preview?.cardPreviewUrl : preview?.detailPreviewUrl;

  return (
    <main className="publisher-shell">
      <header className="publisher-header">
        <div>
          <p className="publisher-kicker">TDP Publisher</p>
          <h1>Lightweight Composer</h1>
          <p className="publisher-subtitle">
            Focus on compose, preview, publish. No history panel.
          </p>
        </div>
        <div className="publisher-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              window.localStorage.removeItem(STORAGE_KEY);
              setDraft(defaultDraftState);
              setPreview(null);
              sessionIdRef.current = null;
              setLastPublishResult(null);
              setError(null);
              setPreviewMessage("Draft reset");
            }}
          >
            Reset Draft
          </button>
          <button
            type="button"
            className="primary"
            onClick={handlePublish}
            disabled={isPublishing || !payloadReadyForPublish(payload)}
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      <div className="publisher-main">
        <section className="compose-panel">
          <div className="tab-row">
            {(["moment", "post", "gallery"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                className={draft.tab === tab ? "tab active" : "tab"}
                onClick={() => setDraft((prev) => ({ ...prev, tab }))}
              >
                {tab}
              </button>
            ))}
          </div>

          {draft.tab === "moment" ? (
            <div className="form-stack">
              <label>
                Content
                <textarea
                  rows={7}
                  placeholder="Write a short moment"
                  value={draft.moment.content}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      moment: { ...prev.moment, content: event.target.value },
                    }))
                  }
                />
              </label>

              <label>
                Locale
                <ChoiceGroup<"en" | "zh">
                  value={draft.moment.locale}
                  options={[
                    { value: "en", label: "English" },
                    { value: "zh", label: "中文" },
                  ]}
                  onChange={(locale) =>
                    setDraft((prev) => ({
                      ...prev,
                      moment: { ...prev.moment, locale },
                    }))
                  }
                />
              </label>

              <label>
                Visibility
                <ChoiceGroup<"public" | "private">
                  value={draft.moment.visibility}
                  options={[
                    { value: "public", label: "Public" },
                    { value: "private", label: "Private" },
                  ]}
                  onChange={(visibility) =>
                    setDraft((prev) => ({
                      ...prev,
                      moment: { ...prev.moment, visibility },
                    }))
                  }
                />
              </label>

              <label>
                Location (optional)
                <input
                  value={draft.moment.locationName}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      moment: { ...prev.moment, locationName: event.target.value },
                    }))
                  }
                  placeholder="Tokyo"
                />
              </label>

              <label className="upload-label">
                Add Media (image/video)
                <input
                  type="file"
                  multiple
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
                  onChange={async (event) => {
                    const files = Array.from(event.target.files || []);
                    for (const file of files) {
                      const uploaded = await handleUpload(file, "moment-media");
                      if (!uploaded) continue;
                      setDraft((prev) => ({
                        ...prev,
                        moment: {
                          ...prev.moment,
                          media: [
                            ...prev.moment.media,
                            {
                              type: uploaded.kind,
                              url: uploaded.url,
                            },
                          ],
                        },
                      }));
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {draft.moment.media.length > 0 ? (
                <div className="chip-list">
                  {draft.moment.media.map((media, index) => (
                    <button
                      type="button"
                      key={`${media.url}-${index}`}
                      className="chip"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          moment: {
                            ...prev.moment,
                            media: prev.moment.media.filter((_, i) => i !== index),
                          },
                        }))
                      }
                    >
                      {media.type} #{index + 1} ×
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {draft.tab === "post" ? (
            <div className="form-stack">
              <label>
                Title
                <input
                  placeholder="Post title"
                  value={draft.post.title}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, title: event.target.value },
                    }))
                  }
                />
              </label>

              <label>
                Content (Markdown)
                <textarea
                  rows={9}
                  placeholder="Write content"
                  value={draft.post.content}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, content: event.target.value },
                    }))
                  }
                />
              </label>

              <label>
                Excerpt (optional)
                <input
                  placeholder="Short summary"
                  value={draft.post.excerpt}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, excerpt: event.target.value },
                    }))
                  }
                />
              </label>

              <label>
                Tags (comma separated)
                <input
                  placeholder="design, note"
                  value={draft.post.tags}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, tags: event.target.value },
                    }))
                  }
                />
              </label>

              <label>
                Locale
                <ChoiceGroup<"en" | "zh">
                  value={draft.post.locale}
                  options={[
                    { value: "en", label: "English" },
                    { value: "zh", label: "中文" },
                  ]}
                  onChange={(locale) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, locale },
                    }))
                  }
                />
              </label>

              <label>
                Status
                <ChoiceGroup<"draft" | "published">
                  value={draft.post.status}
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                  ]}
                  onChange={(status) =>
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, status },
                    }))
                  }
                />
              </label>

              <label className="upload-label">
                Cover Media (image/video)
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const uploaded = await handleUpload(file, "post-cover");
                    if (!uploaded) return;
                    setDraft((prev) => ({
                      ...prev,
                      post: { ...prev.post, coverUrl: uploaded.url },
                    }));
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {draft.post.coverUrl ? (
                <p className="hint">Cover uploaded: {draft.post.coverUrl}</p>
              ) : null}
            </div>
          ) : null}

          {draft.tab === "gallery" ? (
            <div className="form-stack">
              <label className="upload-label">
                Upload Image/Video
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const uploaded = await handleUpload(file, "gallery-file");
                    if (!uploaded) return;
                    setDraft((prev) => ({
                      ...prev,
                      gallery: {
                        ...prev.gallery,
                        fileUrl: uploaded.url,
                        thumbUrl:
                          uploaded.kind === "image" ? uploaded.url : prev.gallery.thumbUrl,
                      },
                    }));
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <label>
                Title (optional)
                <input
                  value={draft.gallery.title}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      gallery: { ...prev.gallery, title: event.target.value },
                    }))
                  }
                  placeholder="Gallery title"
                />
              </label>

              <label>
                Locale
                <ChoiceGroup<"en" | "zh">
                  value={draft.gallery.locale}
                  options={[
                    { value: "en", label: "English" },
                    { value: "zh", label: "中文" },
                  ]}
                  onChange={(locale) =>
                    setDraft((prev) => ({
                      ...prev,
                      gallery: { ...prev.gallery, locale },
                    }))
                  }
                />
              </label>

              <label>
                Video thumb (optional)
                <input
                  placeholder="https://cdn.example.com/thumb.jpg"
                  value={draft.gallery.thumbUrl}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      gallery: { ...prev.gallery, thumbUrl: event.target.value },
                    }))
                  }
                />
              </label>

              {draft.gallery.fileUrl ? (
                <p className="hint">Asset uploaded: {draft.gallery.fileUrl}</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div className="tab-row compact">
              {(["card", "detail"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={previewMode === mode ? "tab active" : "tab"}
                  onClick={() => setPreviewMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="tab-row compact">
              {(["desktop", "mobile"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={deviceMode === mode ? "tab active" : "tab"}
                  onClick={() => setDeviceMode(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div
            className={deviceMode === "desktop" ? "frame-wrap desktop" : "frame-wrap mobile"}
          >
            {activePreviewUrl ? (
              <iframe
                key={`${previewMode}-${deviceMode}-${activePreviewUrl}`}
                src={activePreviewUrl}
                title="Live preview"
                className="preview-frame"
              />
            ) : (
              <div className="preview-placeholder">{previewMessage}</div>
            )}
          </div>

          <div className="status-row">
            <span>{isSyncingPreview ? "Syncing preview..." : previewMessage}</span>
            {uploadingField ? <span>Uploading: {uploadingField}</span> : null}
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {lastPublishResult ? (
            <div className="success-box">
              <p>Published {lastPublishResult.kind} successfully.</p>
              <a href={lastPublishResult.url} target="_blank" rel="noreferrer">
                Open published page
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
