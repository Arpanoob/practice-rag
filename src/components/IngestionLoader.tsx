import { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Database,
  Layers,
  FileText,
  Search,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

export interface IngestionResultPayload {
  videoUrl: string;
  chunksCount: number;
  message: string;
  initialOverview?: string;
  summary?: string;
  sampleChunks?: Array<{
    text: string;
    start: number;
    duration: number;
    score?: number;
  }>;
}

interface IngestionLoaderProps {
  videoUrl: string;
  videoId: string | null;
  onComplete?: (result: IngestionResultPayload) => void;
  onCancel?: () => void;
}

const INGESTION_STEPS = [
  {
    title: "Finding the Video",
    desc: "Locating video details and spoken subtitles",
    icon: Search,
  },
  {
    title: "Reading Speech & Captions",
    desc: "Extracting words and spoken timestamps",
    icon: FileText,
  },
  {
    title: "Organizing Key Topics",
    desc: "Grouping the conversation into coherent moments",
    icon: Layers,
  },
  {
    title: "Understanding Concepts",
    desc: "Learning the key ideas to provide instant answers",
    icon: Sparkles,
  },
  {
    title: "Almost Ready",
    desc: "Preparing your interactive player and video summary",
    icon: Database,
  },
];

export function IngestionLoader({
  videoUrl,
  videoId,
  onComplete,
  onCancel,
}: Readonly<IngestionLoaderProps>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(10);
  const [liveMessage, setLiveMessage] = useState(
    "Getting everything ready for you..."
  );
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [customTranscriptText, setCustomTranscriptText] = useState("");
  const [isCustomStreaming, setIsCustomStreaming] = useState(false);

  useEffect(() => {
    if (!videoUrl || isCustomStreaming) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "";
    const sseUrl = `${apiBase}/api/search/ingest-stream?videoUrl=${encodeURIComponent(
      videoUrl
    )}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          eventSource.close();
          return;
        }

        // Live backend progress update
        if (typeof data.step === "number") {
          setCurrentStep(data.step);
        }
        if (typeof data.progress === "number") {
          setProgress(data.progress);
        }
        if (data.message) {
          setLiveMessage(data.message);
        }

        // Ingestion pipeline finished
        if (data.done) {
          eventSource.close();
          setProgress(100);
          setCurrentStep(4);
          setTimeout(() => {
            onComplete?.(data.result);
          }, 800);
        }
      } catch {
        // Non-JSON SSE message
      }
    };

    eventSource.onerror = () => {
      // If backend SSE fails or is unreachable
      setError(
        "Unable to stream real-time progress from backend. Check if the backend is running."
      );
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [videoUrl, onComplete, retryNonce, isCustomStreaming]);

  const handleCustomTranscriptSubmit = async () => {
    const text = customTranscriptText.trim();
    if (!text || isCustomStreaming) return;

    setIsCustomStreaming(true);
    setError(null);
    setCurrentStep(0);
    setProgress(15);
    setLiveMessage("Connecting to ingestion stream with custom transcript...");

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      const sseUrl = `${apiBase}/api/search/ingest-stream`;

      const response = await fetch(sseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          transcript: text,
          force: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response stream body available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          const trimmedBlock = block.trim();
          if (trimmedBlock.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedBlock.slice(6));
              if (data.error) {
                setError(data.error);
                setIsCustomStreaming(false);
                return;
              }
              if (typeof data.step === "number") setCurrentStep(data.step);
              if (typeof data.progress === "number") setProgress(data.progress);
              if (data.message) setLiveMessage(data.message);

              if (data.done) {
                setProgress(100);
                setCurrentStep(4);
                setTimeout(() => {
                  onComplete?.(data.result);
                }, 800);
                return;
              }
            } catch {
              // Ignore non-json
            }
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to stream custom transcript ingestion."
      );
    } finally {
      setIsCustomStreaming(false);
    }
  };

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  const handleRetry = () => {
    setError(null);
    setShowPasteModal(false);
    setIsCustomStreaming(false);
    setCurrentStep(0);
    setProgress(10);
    // Bump the nonce so the SSE effect re-runs and re-opens the stream.
    setRetryNonce((n) => n + 1);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[650px] sm:h-[650px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse duration-1000"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center">
        {/* Animated Central Glowing Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl shadow-red-600/20 relative z-10 overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <Sparkles className="w-10 h-10 text-red-500 animate-pulse" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent flex items-end justify-center pb-1">
              <span className="text-[10px] font-mono text-neutral-300">
                {videoId || "YOUTUBE"}
              </span>
            </div>
          </div>
          {/* Animated pulsing orbit rings */}
          <div className="absolute inset-0 -m-3 rounded-3xl border border-red-500/30 animate-ping opacity-25" />
          <div className="absolute inset-0 -m-6 rounded-3xl border border-rose-500/20 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          {error ? "Couldn't Load Video" : "Preparing Your Video..."}
        </h2>
        <p className="text-sm text-neutral-400 max-w-md mb-4 leading-relaxed">
          {error ? error : liveMessage}
        </p>

        {/* Video URL chip */}
        <div className="mb-6 px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs font-mono text-neutral-400 max-w-full truncate">
          {videoUrl}
        </div>

        {!error ? (
          <>
            {/* Real Progress Bar */}
            <div className="w-full mb-8">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Analyzing video in real time
                </span>
                <span className="font-mono text-red-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-900 border border-neutral-800/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Live Stepped Checklist */}
            <div className="w-full space-y-2.5 text-left mb-8">
              {INGESTION_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;

                let borderClass =
                  "border-neutral-900 bg-neutral-950/40 text-neutral-600";
                if (isCompleted) {
                  borderClass =
                    "border-neutral-800 bg-neutral-900/60 text-neutral-300";
                } else if (isCurrent) {
                  borderClass =
                    "border-red-500/60 bg-neutral-900/90 text-neutral-100 ring-2 ring-red-500/10";
                }

                return (
                  <div
                    key={step.title}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${borderClass}`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                      ) : (
                        <StepIcon className="w-4 h-4 text-neutral-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-semibold">
                          {step.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-red-400 font-medium animate-pulse">
                            Processing...
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 leading-tight mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Error State Actions */
          <div className="w-full flex flex-col items-center gap-3 mt-4">
            {showPasteModal ? (
              <div className="w-full p-4 sm:p-5 rounded-2xl bg-neutral-900/95 border border-neutral-800 text-left space-y-3.5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span className="text-xs sm:text-sm font-bold text-neutral-100">
                      Paste Transcript or Subtitles
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  YouTube blocked or does not have auto-captions for this video. Paste the transcript, notes, or subtitles below. Embeddings will be streamed in safe batches with zero timeouts.
                </p>

                <textarea
                  rows={6}
                  value={customTranscriptText}
                  onChange={(e) => setCustomTranscriptText(e.target.value)}
                  placeholder="Paste video transcript, subtitles, or notes here... (Supports timestamps like [01:23] or plain text)"
                  className="w-full p-3 text-xs font-mono rounded-xl bg-neutral-950 border border-neutral-800 focus:border-red-500/70 focus:outline-none text-neutral-200 placeholder:text-neutral-600 resize-y leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {customTranscriptText.length > 0
                      ? `${customTranscriptText.length.toLocaleString()} characters`
                      : "Supports any length"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteModal(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!customTranscriptText.trim() || isCustomStreaming}
                      onClick={handleCustomTranscriptSubmit}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-xs text-white font-medium shadow-md shadow-red-600/30 cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isCustomStreaming ? "Streaming..." : "Stream Ingest Video"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-center">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Search
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 text-xs text-neutral-200 font-medium cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Connection
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-medium shadow-md shadow-red-600/30 cursor-pointer transition-all active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paste Transcript
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel button if still ingesting */}
        {!error && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-neutral-300 underline cursor-pointer transition-colors"
          >
            Cancel and go back
          </button>
        )}
      </div>
    </div>
  );
}
