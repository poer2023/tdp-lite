export type SearchSource = "next" | "go";

interface SearchSourceErrorOptions {
  source: SearchSource;
  fallbackEligible: boolean;
  statusCode?: number;
  cause?: unknown;
}

export class SearchSourceError extends Error {
  source: SearchSource;
  fallbackEligible: boolean;
  statusCode?: number;

  constructor(message: string, options: SearchSourceErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "SearchSourceError";
    this.source = options.source;
    this.fallbackEligible = options.fallbackEligible;
    this.statusCode = options.statusCode;
  }
}

export class SearchDualSourceError extends Error {
  primarySource: SearchSource;
  secondarySource: SearchSource;
  primaryError: unknown;
  secondaryError: unknown;

  constructor(params: {
    primarySource: SearchSource;
    secondarySource: SearchSource;
    primaryError: unknown;
    secondaryError: unknown;
  }) {
    super("search failed on both primary and fallback sources");
    this.name = "SearchDualSourceError";
    this.primarySource = params.primarySource;
    this.secondarySource = params.secondarySource;
    this.primaryError = params.primaryError;
    this.secondaryError = params.secondaryError;
  }
}
