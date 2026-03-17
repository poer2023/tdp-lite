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
  locale: "zh",
  visibility: "public",
  locationName: "",
  media: [],
};

const defaultPostDraft: PostDraft = {
  title: "",
  content: "",
  excerpt: "",
  tags: "",
  locale: "zh",
  status: "draft",
  coverUrl: "",
};

const defaultGalleryDraft: GalleryDraft = {
  locale: "zh",
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

function normalizePublisherTab(value: PublisherTab | string | undefined): "moment" | "post" {
  return value === "post" ? "post" : "moment";
}

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
      tab: normalizePublisherTab(parsed.data.tab),
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
        locale: "zh",
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
        locale: "zh",
        tags,
        status: draft.post.status,
        coverUrl: draft.post.coverUrl.trim() || undefined,
      },
    };
  }

  return {
    kind: "gallery",
    data: {
      locale: "zh",
      title: draft.gallery.title.trim() || undefined,
      fileUrl: draft.gallery.fileUrl,
      thumbUrl: draft.gallery.thumbUrl.trim() || undefined,
    },
  };
}

function payloadHasContent(payload: PreviewDraftPayload): boolean {
  if (payload.kind === "moment") {
    return (
      payload.data.content.trim().length > 0 || payload.data.media.length > 0
    );
  }

  if (payload.kind === "post") {
    return (
      payload.data.title.trim().length > 0 ||
      payload.data.content.trim().length > 0
    );
  }

  return payload.data.fileUrl.trim().length > 0;
}

function payloadReadyForPublish(payload: PreviewDraftPayload): boolean {
  if (payload.kind === "moment") {
    return (
      payload.data.content.trim().length > 0 || payload.data.media.length > 0
    );
  }
  if (payload.kind === "post") {
    return (
      payload.data.title.trim().length > 0 &&
      payload.data.content.trim().length > 0
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
  const [draft, setDraft] = useState<DraftState>(defaultDraftState);
  const [hasLoadedStoredDraft, setHasLoadedStoredDraft] = useState(false);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("card");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const sessionIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<PreviewSessionResponse | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>("等待输入...");
  const [isSyncingPreview, setIsSyncingPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPublishResult, setLastPublishResult] =
    useState<PublishResult | null>(null);

  useEffect(() => {
    const storedDraft = parseStoredDraft(
      window.localStorage.getItem(STORAGE_KEY)
    );
    setDraft(storedDraft);
    setHasLoadedStoredDraft(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredDraft) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        data: draft,
      })
    );
  }, [draft, hasLoadedStoredDraft]);

  const payload = useMemo(() => toPayload(draft), [draft]);

  useEffect(() => {
    if (!payloadHasContent(payload)) {
      setPreview(null);
      setPreviewMessage("等待输入...");
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
        setPreviewMessage("预览已同步");
      } catch (syncError) {
        if (!controller.signal.aborted) {
          const message =
            syncError instanceof Error
              ? syncError.message
              : "Failed to sync preview";
          setError(message);
          setPreviewMessage("预览同步失败，请重试");
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
      setPreviewMessage("发布成功，可以继续创建下一条内容。");

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
    previewMode === "card"
      ? preview?.cardPreviewUrl
      : preview?.detailPreviewUrl;

  return (
    <main className="publisher-shell">
      <header className="publisher-header">
        <div>
          <p className="publisher-kicker">TDP 发布台</p>
          <h1>轻量发布工作台</h1>
          <p className="publisher-subtitle">
            专注于动态与文章的撰写、预览和发布，固定为中文内容流程。
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
              setPreviewMessage("草稿已重置");
            }}
          >
            重置草稿
          </button>
          <button
            type="button"
            className="primary"
            onClick={handlePublish}
            disabled={isPublishing || !payloadReadyForPublish(payload)}
          >
            {isPublishing ? "发布中..." : "发布"}
          </button>
        </div>
      </header>

      <div className="publisher-main">
        <section className="compose-panel">
          <div className="tab-row">
            {(
              [
                { value: "moment", label: "动态" },
                { value: "post", label: "文章" },
              ] as const
            ).map((tab) => (
              <button
                type="button"
                key={tab.value}
                className={draft.tab === tab.value ? "tab active" : "tab"}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, tab: tab.value }))
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {draft.tab === "moment" ? (
            <div className="form-stack">
              <label>
                内容
                <textarea
                  rows={7}
                  placeholder="写一条动态"
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
                可见性
                <ChoiceGroup<"public" | "private">
                  value={draft.moment.visibility}
                  options={[
                    { value: "public", label: "公开" },
                    { value: "private", label: "私密" },
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
                地点（可选）
                <input
                  value={draft.moment.locationName}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      moment: {
                        ...prev.moment,
                        locationName: event.target.value,
                      },
                    }))
                  }
                  placeholder="东京"
                />
              </label>

              <label className="upload-label">
                添加媒体（图片/视频）
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
                            media: prev.moment.media.filter(
                              (_, i) => i !== index
                            ),
                          },
                        }))
                      }
                    >
                      {(media.type === "image" ? "图片" : "视频") +
                        ` #${index + 1} ×`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {draft.tab === "post" ? (
            <div className="form-stack">
              <label>
                标题
                <input
                  placeholder="文章标题"
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
                正文（Markdown）
                <textarea
                  rows={9}
                  placeholder="写正文内容"
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
                摘要（可选）
                <input
                  placeholder="简短摘要"
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
                标签（逗号分隔）
                <input
                  placeholder="设计, 随笔"
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
                状态
                <ChoiceGroup<"draft" | "published">
                  value={draft.post.status}
                  options={[
                    { value: "draft", label: "草稿" },
                    { value: "published", label: "已发布" },
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
                封面媒体（图片/视频）
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
                <p className="hint">封面已上传：{draft.post.coverUrl}</p>
              ) : null}
            </div>
          ) : null}

          {draft.tab === "gallery" ? (
            null
          ) : null}
        </section>

        <section className="preview-panel">
          <div className="preview-toolbar">
            <div className="tab-row compact">
              {(
                [
                  { value: "card", label: "卡片" },
                  { value: "detail", label: "详情" },
                ] as const
              ).map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  className={previewMode === mode.value ? "tab active" : "tab"}
                  onClick={() => setPreviewMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="tab-row compact">
              {(
                [
                  { value: "desktop", label: "桌面" },
                  { value: "mobile", label: "手机" },
                ] as const
              ).map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  className={deviceMode === mode.value ? "tab active" : "tab"}
                  onClick={() => setDeviceMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={
              deviceMode === "desktop"
                ? "frame-wrap desktop"
                : "frame-wrap mobile"
            }
          >
            {activePreviewUrl ? (
              <iframe
                key={`${previewMode}-${deviceMode}-${activePreviewUrl}`}
                src={activePreviewUrl}
                title="实时预览"
                className="preview-frame"
              />
            ) : (
              <div className="preview-placeholder">{previewMessage}</div>
            )}
          </div>

          <div className="status-row">
            <span>{isSyncingPreview ? "正在同步预览..." : previewMessage}</span>
            {uploadingField ? <span>正在上传：{uploadingField}</span> : null}
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {lastPublishResult ? (
            <div className="success-box">
              <p>
                {lastPublishResult.kind === "moment"
                  ? "动态"
                  : lastPublishResult.kind === "post"
                    ? "文章"
                    : "相册"}
                发布成功。
              </p>
              <a href={lastPublishResult.url} target="_blank" rel="noreferrer">
                打开已发布页面
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
