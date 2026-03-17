import type { Moment } from "@/lib/content/types";

type MomentDisplayLocale = "en" | "zh";

export function resolveMomentDisplay(params: {
  content: string;
  mediaTitle?: string | null;
  locale: MomentDisplayLocale;
}): { text: string; usesFallback: boolean } {
  const content = params.content.trim();
  if (content.length > 0) {
    return { text: content, usesFallback: false };
  }

  const mediaTitle = params.mediaTitle?.trim() ?? "";
  if (mediaTitle.length > 0) {
    return { text: mediaTitle, usesFallback: false };
  }

  return {
    text: params.locale === "zh" ? "影像记录" : "Media note",
    usesFallback: true,
  };
}

export function resolveMomentDisplayFromMoment(
  moment: Pick<Moment, "content" | "locale">,
  mediaTitle?: string | null
) {
  return resolveMomentDisplay({
    content: moment.content,
    mediaTitle,
    locale: moment.locale === "zh" ? "zh" : "en",
  });
}
