"use client";

import {
  formatDate,
  formatRelativeTime,
  formatRelativeTimeUppercase,
} from "@/lib/utils";

interface RelativeTimeLabelProps {
  date: Date | string;
  locale?: string;
  uppercase?: boolean;
  className?: string;
}

export function RelativeTimeLabel({
  date,
  locale = "en",
  uppercase = false,
  className,
}: RelativeTimeLabelProps) {
  const dateTime = typeof date === "string" ? date : date.toISOString();
  const text = uppercase
    ? formatRelativeTimeUppercase(date, locale)
    : formatRelativeTime(date, locale);

  return (
    <time
      suppressHydrationWarning
      dateTime={dateTime}
      title={formatDate(date, locale)}
      className={className}
    >
      {text}
    </time>
  );
}
