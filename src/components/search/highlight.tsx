import type { ReactNode } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

export function highlightText(text: string, query: string): ReactNode {
  const searchTerms = getSearchTerms(query);
  if (!text || searchTerms.length === 0) {
    return text;
  }

  const matcher = new RegExp(searchTerms.map(escapeRegExp).join("|"), "gi");
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(matcher)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    nodes.push(
      <mark
        key={`${start}-${end}-${match[0]}`}
        className="rounded bg-amber-200/80 px-0.5 text-current"
      >
        {text.slice(start, end)}
      </mark>
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
