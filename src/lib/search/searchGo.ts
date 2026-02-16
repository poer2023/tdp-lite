import type { SearchRequest, SearchSection, SearchSectionResponse } from "./contracts";
import { SearchSourceError } from "./errors";

const SEARCH_TIMEOUT_MS = 3000;

function resolveGoApiBaseUrl(): string {
  const explicit =
    process.env.TDP_API_BASE_URL || process.env.NEXT_PUBLIC_TDP_API_BASE_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8080";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AbortError"
  );
}

export async function searchBySectionInGo<S extends SearchSection>(
  input: SearchRequest
): Promise<SearchSectionResponse<S>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  const url = `${resolveGoApiBaseUrl()}/v1/public/search`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof (payload as { message?: string }).message === "string"
          ? (payload as { message: string }).message
          : `go search request failed (${response.status})`;
      throw new SearchSourceError(message, {
        source: "go",
        fallbackEligible: response.status >= 500,
        statusCode: response.status,
      });
    }

    return payload as SearchSectionResponse<S>;
  } catch (error) {
    if (error instanceof SearchSourceError) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new SearchSourceError("go search timed out", {
        source: "go",
        fallbackEligible: true,
        statusCode: 504,
        cause: error,
      });
    }

    const message =
      error instanceof Error ? error.message : "go search network error";
    throw new SearchSourceError(message, {
      source: "go",
      fallbackEligible: true,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}
