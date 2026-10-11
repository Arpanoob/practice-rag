import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
} from "lucide-react";
import { parseTimestamp } from "../utils/youtube";

interface VideoSummaryProps {
  videoUrl: string;
  onSeek?: (seconds: number) => void;
  initialSummary?: string;
}

export function VideoSummary({
  videoUrl,
  onSeek,
  initialSummary,
}: Readonly<VideoSummaryProps>) {
  const [fetchedSummary, setFetchedSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const activeSummary = fetchedSummary || initialSummary || null;
  const isLoading = loading && !activeSummary;

  const fetchSummary = useCallback(
    async (refresh: boolean = false, signal?: AbortSignal) => {
      if (!videoUrl) return;

      setLoading(true);
      setError(null);

      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "";
        const url = `${apiBase}/api/ask/summary?videoUrl=${encodeURIComponent(
          videoUrl
        )}${refresh ? "&refresh=true" : ""}`;

        const res = await fetch(url, { signal });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load video summary.");
        }

        setFetchedSummary(data.data?.summary || "No summary available.");
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Summary generation timed out. Click Refresh to retry.");
          return;
        }
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Unable to generate video summary.";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [videoUrl]
  );

  useEffect(() => {
    if (initialSummary) return;

    let ignore = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const loadSummary = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || "";
        const url = `${apiBase}/api/ask/summary?videoUrl=${encodeURIComponent(
          videoUrl
        )}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (ignore) return;

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load video summary.");
        }
        setFetchedSummary(data.data?.summary || "No summary available.");
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setError("Summary generation timed out. Click Refresh to retry.");
          } else {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to generate video summary."
            );
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      ignore = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [videoUrl, initialSummary]);

  const handleCopy = async () => {
    if (!activeSummary) return;
    try {
      await navigator.clipboard.writeText(activeSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  /**
   * Helper to parse line and replace timestamp tags like [0:04] or [1:28] with clickable jump badges
   */
  const renderFormattedLine = (line: string, lineIndex: number) => {
    // Regex matching timestamp tags like [0:04], [1:28], [15:30]
    const timestampRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = timestampRegex.exec(line)) !== null) {
      const matchStart = match.index;
      const matchEnd = timestampRegex.lastIndex;
      const timeStr = match[1];
      const seconds = parseTimestamp(timeStr);

      if (matchStart > lastIndex) {
        parts.push(line.slice(lastIndex, matchStart));
      }

      parts.push(
        <button
          key={`ts-${lineIndex}-${matchStart}`}
          type="button"
          onClick={() => seconds !== null && onSeek?.(seconds)}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 font-mono text-[11px] font-semibold transition-all cursor-pointer align-baseline shadow-xs"
          title={`Jump video to ${timeStr}`}
        >
          <Play className="w-2.5 h-2.5 fill-current shrink-0" />
          <span>{timeStr}</span>
        </button>
      );

      lastIndex = matchEnd;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/90 shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-600/15 text-red-400 border border-red-500/20 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-neutral-100">
                Video Summary & Highlights
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                <Sparkles className="w-2.5 h-2.5" />
                AI Summary
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Click any timestamp to play that moment
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!activeSummary || loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer disabled:opacity-40"
            title="Copy summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => fetchSummary(true)}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors cursor-pointer disabled:opacity-40"
            title="Regenerate summary"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-400" : ""}`}
            />
            <span className="text-[11px] hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center p-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse summary" : "Expand summary"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Summary Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          {isLoading ? (
            /* Loading Skeleton */
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                <span>
                  Creating your video summary and finding key moments...
                </span>
              </div>
              <div className="h-4 bg-neutral-800/60 rounded-md w-3/4" />
              <div className="h-4 bg-neutral-800/50 rounded-md w-full" />
              <div className="h-4 bg-neutral-800/50 rounded-md w-5/6" />
              <div className="pt-2 space-y-2">
                <div className="h-3.5 bg-neutral-800/40 rounded-md w-1/2" />
                <div className="h-3.5 bg-neutral-800/40 rounded-md w-2/3" />
                <div className="h-3.5 bg-neutral-800/40 rounded-md w-3/5" />
              </div>
            </div>
          ) : error && !activeSummary ? (
            /* Error State */
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchSummary(true)}
                  className="mt-2 text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
                >
                  Click to retry summary generation
                </button>
              </div>
            </div>
          ) : activeSummary ? (
            /* Rendered Markdown Summary */
            <div className="space-y-3.5 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
              {activeSummary.split("\n").map((line, idx) => {
                const trimmed = line.trim();

                if (!trimmed) {
                  return <div key={idx} className="h-1.5" />;
                }

                // Header 3 (###)
                if (trimmed.startsWith("###")) {
                  const title = trimmed.replace(/^###\s*/, "");
                  return (
                    <div
                      key={idx}
                      className="pt-2 pb-1 border-b border-neutral-800/60 flex items-center gap-2 text-neutral-100 font-bold text-xs sm:text-sm tracking-wide"
                    >
                      <span>{title}</span>
                    </div>
                  );
                }

                // Header 2 (##)
                if (trimmed.startsWith("##")) {
                  const title = trimmed.replace(/^##\s*/, "");
                  return (
                    <div
                      key={idx}
                      className="pt-3 pb-1 text-white font-extrabold text-sm sm:text-base tracking-wide"
                    >
                      {title}
                    </div>
                  );
                }

                // Bullet points
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                  const bulletContent = trimmed.slice(2);
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-2 pl-1 py-0.5 text-neutral-300"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                      <div className="flex-1 leading-relaxed">
                        {renderFormattedLine(bulletContent, idx)}
                      </div>
                    </div>
                  );
                }

                // Regular Paragraph
                return (
                  <p key={idx} className="text-neutral-300 leading-relaxed">
                    {renderFormattedLine(trimmed, idx)}
                  </p>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
