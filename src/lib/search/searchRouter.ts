import type { SearchRequest, SearchSection, SearchSectionResponse } from "./contracts";
import { SearchDualSourceError, SearchSourceError, type SearchSource } from "./errors";
import { searchBySectionInGo } from "./searchGo";
import { searchBySectionInNext } from "./searchNext";

export interface RoutedSearchResult<S extends SearchSection> {
  payload: SearchSectionResponse<S>;
  source: SearchSource;
  fallback: boolean;
}

function resolvePrimarySource(): SearchSource {
  return process.env.TDP_SEARCH_PRIMARY === "go" ? "go" : "next";
}

function fallbackSource(source: SearchSource): SearchSource {
  return source === "go" ? "next" : "go";
}

async function executeSearch<S extends SearchSection>(
  source: SearchSource,
  input: SearchRequest
): Promise<SearchSectionResponse<S>> {
  if (source === "go") {
    return searchBySectionInGo(input);
  }
  return searchBySectionInNext(input);
}

function canFallback(error: unknown): boolean {
  if (error instanceof SearchSourceError) {
    return error.fallbackEligible;
  }
  return true;
}

export async function routeSearchWithFallback<S extends SearchSection>(
  input: SearchRequest
): Promise<RoutedSearchResult<S>> {
  const primary = resolvePrimarySource();
  const secondary = fallbackSource(primary);

  try {
    const payload = await executeSearch<S>(primary, input);
    return { payload, source: primary, fallback: false };
  } catch (primaryError) {
    if (!canFallback(primaryError)) {
      throw primaryError;
    }

    try {
      const payload = await executeSearch<S>(secondary, input);
      return { payload, source: secondary, fallback: true };
    } catch (secondaryError) {
      throw new SearchDualSourceError({
        primarySource: primary,
        secondarySource: secondary,
        primaryError,
        secondaryError,
      });
    }
  }
}
