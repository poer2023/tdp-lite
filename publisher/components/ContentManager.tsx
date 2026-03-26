"use client";

import { useEffect, useState } from "react";
import type {
  ManageCardSpanValue,
  ManageContentStatus,
  ManagedMoment,
  ManagedMomentListResponse,
  ManagedPost,
  ManagedPostListResponse,
} from "@/lib/contracts";
import {
  managedMomentListResponseSchema,
  managedPostListResponseSchema,
} from "@/lib/contracts";

type ContentKind = "moment" | "post";
type ManagedItem = ManagedMoment | ManagedPost;

const PAGE_SIZE = 50;

const kindOptions: Array<{ value: ContentKind; label: string }> = [
  { value: "moment", label: "动态" },
  { value: "post", label: "文章" },
];

const statusOptions: Array<{ value: ManageContentStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "归档" },
];

const cardSpanOptions: Array<{ value: ManageCardSpanValue; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "1x1", label: "1×1" },
  { value: "1x2", label: "1×2" },
  { value: "2x1", label: "2×1" },
  { value: "2x2", label: "2×2" },
];

function formatDateLabel(value: string | undefined): string {
  if (!value) {
    return "未发布";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStatusLabel(
  status: ManageContentStatus | ManagedPost["status"]
) {
  switch (status) {
    case "published":
      return "已发布";
    case "draft":
      return "草稿";
    case "archived":
      return "归档";
    default:
      return "全部";
  }
}

function formatCardSpanLabel(value: ManageCardSpanValue | null | undefined) {
  switch (value) {
    case "1x1":
      return "1×1";
    case "1x2":
      return "1×2";
    case "2x1":
      return "2×1";
    case "2x2":
      return "2×2";
    default:
      return "自动";
  }
}

function summarizePost(item: ManagedPost): string {
  if (item.excerpt?.trim()) {
    return item.excerpt.trim();
  }

  const summary = String(item.content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!summary) {
    return "未填写正文";
  }

  return summary.slice(0, 120);
}

function summarizeMoment(item: ManagedMoment): string {
  const mediaCount = Array.isArray(item.media) ? item.media.length : 0;
  const content = typeof item.content === "string" ? item.content.trim() : "";
  const mediaLabel = mediaCount > 0 ? `媒体 ${mediaCount} 项` : "无媒体";
  const locationLabel = item.location?.name ? ` · ${item.location.name}` : "";
  const visibilityLabel = item.visibility === "public" ? "公开" : "私密";

  if (content) {
    return `${content.slice(0, 120)} · ${mediaLabel} · ${visibilityLabel}${locationLabel}`;
  }

  return `纯媒体动态 · ${mediaLabel} · ${visibilityLabel}${locationLabel}`;
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

function parseManagementItems(
  kind: ContentKind,
  payload: unknown
): ManagedMomentListResponse | ManagedPostListResponse {
  const parsed =
    kind === "post"
      ? managedPostListResponseSchema.safeParse(payload)
      : managedMomentListResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("内容列表数据格式异常，请刷新后重试。");
  }

  return parsed.data;
}

type ThumbnailProps = {
  src?: string;
  type?: "image" | "video";
  alt: string;
  badge?: string;
};

function CardThumbnail({ src, type = "image", alt, badge }: ThumbnailProps) {
  if (!src) {
    return null;
  }

  return (
    <div className="manager-card-thumbnail">
      {type === "video" ? (
        <video
          className="manager-card-thumbnail-media"
          src={src}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          className="manager-card-thumbnail-media"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      )}
      {badge ? (
        <span className="manager-card-thumbnail-badge">{badge}</span>
      ) : null}
    </div>
  );
}

export function ContentManager() {
  const [kind, setKind] = useState<ContentKind>("moment");
  const [status, setStatus] = useState<ManageContentStatus>("all");
  const [items, setItems] = useState<ManagedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadItems = async (
    nextKind: ContentKind,
    nextStatus: ManageContentStatus
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/manage/content?kind=${nextKind}&status=${nextStatus}&limit=${PAGE_SIZE}`,
        { cache: "no-store" }
      );
      const payload = await parseJsonResponse<unknown>(response);
      const parsed = parseManagementItems(nextKind, payload);
      setItems(parsed.items);
      return true;
    } catch (loadError) {
      const nextMessage =
        loadError instanceof Error ? loadError.message : "内容列表加载失败";
      setError(nextMessage);
      setItems([]);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems(kind, status);
  }, [kind, status]);

  const handleRefresh = async () => {
    setMessage(null);
    if (await loadItems(kind, status)) {
      setMessage("列表已刷新。");
    }
  };

  const handleUnpublish = async (id: string) => {
    if (!window.confirm("确认将这条内容转回草稿吗？公开页会立即隐藏。")) {
      return;
    }

    setActingId(id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/manage/content/${kind}/${id}/unpublish`,
        {
          method: "POST",
        }
      );
      await parseJsonResponse<{ item: ManagedItem }>(response);
      const refreshed = await loadItems(kind, status);
      setMessage(
        refreshed ? "内容已转为草稿。" : "内容已转为草稿，列表刷新失败。"
      );
    } catch (actionError) {
      const nextMessage =
        actionError instanceof Error ? actionError.message : "取消发布失败";
      setError(nextMessage);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "确认删除这条内容吗？这是软删除，公开页会隐藏，但不会物理清库。"
      )
    ) {
      return;
    }

    setActingId(id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/manage/content/${kind}/${id}`, {
        method: "DELETE",
      });
      await parseJsonResponse<{ ok: true }>(response);
      const refreshed = await loadItems(kind, status);
      setMessage(refreshed ? "内容已删除。" : "内容已删除，列表刷新失败。");
    } catch (actionError) {
      const nextMessage =
        actionError instanceof Error ? actionError.message : "删除失败";
      setError(nextMessage);
    } finally {
      setActingId(null);
    }
  };

  const handleCardSpanChange = async (
    id: string,
    cardSpan: ManageCardSpanValue
  ) => {
    setActingId(id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/manage/content/${kind}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardSpan }),
      });
      const payload = await parseJsonResponse<{ item: ManagedItem }>(response);
      setItems((current) =>
        current.map((item) => (item.id === id ? payload.item : item))
      );
      setMessage(`卡片样式已更新为 ${formatCardSpanLabel(cardSpan)}。`);
    } catch (actionError) {
      const nextMessage =
        actionError instanceof Error ? actionError.message : "卡片样式更新失败";
      setError(nextMessage);
    } finally {
      setActingId(null);
    }
  };

  const renderPostCard = (item: ManagedPost) => {
    const isActing = actingId === item.id;
    const tagCount = Array.isArray(item.tags) ? item.tags.length : 0;
    const revision = typeof item.revision === "number" ? item.revision : 1;
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : "未命名文章";
    const slug =
      typeof item.slug === "string" && item.slug.trim()
        ? item.slug.trim()
        : "未生成";
    const coverSrc = item.coverUrl;

    return (
      <article key={item.id} className="manager-card">
        <div className="manager-card-head">
          <div className="manager-chip-row">
            <span className={`status-pill ${item.status}`}>
              {formatStatusLabel(item.status)}
            </span>
            <span className="subtle-pill">文章</span>
          </div>
          <span className="manager-card-time">
            {formatDateLabel(item.publishedAt ?? item.createdAt)}
          </span>
        </div>

        <h2 className="manager-card-title">{title}</h2>
        <p className="manager-card-summary">{summarizePost(item)}</p>
        <CardThumbnail
          src={coverSrc}
          alt={`${title} 的封面缩略图`}
          badge={coverSrc ? "封面" : undefined}
        />

        <div className="manager-card-meta">
          <span>Slug · {slug}</span>
          <span>标签 {tagCount} 个</span>
          <span>修订 {revision}</span>
        </div>

        <label className="manager-card-select-row">
          <span>卡片样式</span>
          <select
            value={item.cardSpan ?? "auto"}
            onChange={(event) =>
              void handleCardSpanChange(
                item.id,
                event.target.value as ManageCardSpanValue
              )
            }
            disabled={isActing}
          >
            {cardSpanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="manager-card-actions">
          {item.status === "published" ? (
            <button
              type="button"
              className="ghost"
              onClick={() => void handleUnpublish(item.id)}
              disabled={isActing}
            >
              {isActing ? "处理中..." : "取消发布"}
            </button>
          ) : null}
          <button
            type="button"
            className="danger-button"
            onClick={() => void handleDelete(item.id)}
            disabled={isActing}
          >
            {isActing ? "处理中..." : "删除"}
          </button>
        </div>
      </article>
    );
  };

  const renderMomentCard = (item: ManagedMoment) => {
    const isActing = actingId === item.id;
    const mediaCount = Array.isArray(item.media) ? item.media.length : 0;
    const safeContent =
      typeof item.content === "string" ? item.content.trim() : "";
    const title = safeContent || "纯媒体动态";
    const shortId =
      typeof item.id === "string" && item.id.length >= 8
        ? item.id.slice(0, 8)
        : "unknown";
    const primaryMedia = Array.isArray(item.media) ? item.media[0] : undefined;
    const thumbnailSrc =
      primaryMedia?.thumbnailUrl ||
      (primaryMedia?.type === "image" ? primaryMedia.url : undefined) ||
      primaryMedia?.url;
    const thumbnailType = primaryMedia?.type ?? "image";
    const thumbnailBadge =
      mediaCount > 1
        ? `${mediaCount} 项媒体`
        : primaryMedia
          ? "媒体预览"
          : undefined;

    return (
      <article key={item.id} className="manager-card">
        <div className="manager-card-head">
          <div className="manager-chip-row">
            <span className={`status-pill ${item.status}`}>
              {formatStatusLabel(item.status)}
            </span>
            <span className="subtle-pill">
              {item.visibility === "public" ? "公开" : "私密"}
            </span>
          </div>
          <span className="manager-card-time">
            {formatDateLabel(item.publishedAt ?? item.createdAt)}
          </span>
        </div>

        <h2 className="manager-card-title">{title}</h2>
        <p className="manager-card-summary">{summarizeMoment(item)}</p>
        <CardThumbnail
          src={thumbnailSrc}
          type={thumbnailType}
          alt={`${title} 的媒体缩略图`}
          badge={thumbnailBadge}
        />

        <div className="manager-card-meta">
          <span>媒体 {mediaCount} 项</span>
          <span>ID · {shortId}</span>
          <span>{item.location?.name || "未设置位置"}</span>
        </div>

        <label className="manager-card-select-row">
          <span>卡片样式</span>
          <select
            value={item.cardSpan ?? "auto"}
            onChange={(event) =>
              void handleCardSpanChange(
                item.id,
                event.target.value as ManageCardSpanValue
              )
            }
            disabled={isActing}
          >
            {cardSpanOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="manager-card-actions">
          {item.status === "published" ? (
            <button
              type="button"
              className="ghost"
              onClick={() => void handleUnpublish(item.id)}
              disabled={isActing}
            >
              {isActing ? "处理中..." : "取消发布"}
            </button>
          ) : null}
          <button
            type="button"
            className="danger-button"
            onClick={() => void handleDelete(item.id)}
            disabled={isActing}
          >
            {isActing ? "处理中..." : "删除"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <main className="publisher-shell">
      <header className="publisher-header">
        <div>
          <p className="publisher-kicker">TDP 管理台</p>
          <h1>内容管理</h1>
          <p className="publisher-subtitle">
            独立于主站前台的后台管理页，仅处理动态与文章的下线和删除。
          </p>
        </div>
        <div className="publisher-actions">
          <a href="/" className="ghost">
            返回发布台
          </a>
          <form action="/api/auth/logout" method="post" className="inline-form">
            <button type="submit" className="ghost">
              退出登录
            </button>
          </form>
          <button
            type="button"
            className="ghost"
            onClick={() => void handleRefresh()}
            disabled={isLoading || actingId !== null}
          >
            刷新列表
          </button>
        </div>
      </header>

      <section className="manager-panel">
        <div className="manager-toolbar">
          <div className="tab-row">
            {kindOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={kind === option.value ? "tab active" : "tab"}
                onClick={() => {
                  setMessage(null);
                  setKind(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="hint">
            当前固定读取中文内容，默认展示最近 50 条未删除记录。
          </p>
        </div>

        <div className="manager-filter-row" role="group" aria-label="筛选状态">
          {statusOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={status === option.value ? "choice active" : "choice"}
              onClick={() => {
                setMessage(null);
                setStatus(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error ? <div className="error-box">{error}</div> : null}
        {message ? (
          <div className="success-box">
            <p>{message}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="manager-empty">正在加载内容列表...</div>
        ) : items.length === 0 ? (
          <div className="manager-empty">当前筛选条件下没有内容。</div>
        ) : (
          <div className="manager-list">
            {kind === "post"
              ? (items as ManagedPost[]).map(renderPostCard)
              : (items as ManagedMoment[]).map(renderMomentCard)}
          </div>
        )}
      </section>
    </main>
  );
}
