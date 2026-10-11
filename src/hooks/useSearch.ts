import { useState, useCallback, useRef, useEffect } from "react";
import type {
  VideoSearchResult,
  SearchParams,
  SearchApiResponse,
  UseSearchOptions,
  UseSearchResult,
} from "../interface/search.interface";

export type * from "../interface/search.interface";

const DEFAULT_API_ENDPOINT =
  (import.meta.env.VITE_API_BASE_URL || "") + "/api/ask";

export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const [data, setData] = useState<VideoSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    abort();
    setData(null);
    setError(null);
    setIsLoading(false);
  }, [abort]);

  const search = useCallback(
    async (
      paramsOrQuery: SearchParams | string,
      optionalVideoUrl?: string
    ): Promise<VideoSearchResult | null> => {
      const isString = typeof paramsOrQuery === "string";
      const query = (isString ? paramsOrQuery : paramsOrQuery.query || "").trim();
      const videoUrl = (
        optionalVideoUrl ||
        (!isString ? paramsOrQuery.videoUrl : "") ||
        options.defaultVideoUrl ||
        ""
      ).trim();

      if (!query) {
        setError("Search query cannot be empty.");
        return null;
      }

      if (!videoUrl) {
        setError("A valid YouTube videoUrl is required for transcript search.");
        return null;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      const endpoint = options.endpoint || DEFAULT_API_ENDPOINT;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ videoUrl, query }),
          signal: controller.signal,
        });

        const body: SearchApiResponse = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            body?.error || `Search failed with status ${response.status}`
          );
        }

        if (body?.success === false) {
          throw new Error(body.error || "Search operation was unsuccessful.");
        }

        const result = body?.data || null;
        setData(result);
        return result;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }

        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during search.";

        setError(message);
        setData(null);
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [options.endpoint, options.defaultVideoUrl]
  );

  return {
    data,
    isLoading,
    error,
    search,
    reset,
    abort,
  };
}
