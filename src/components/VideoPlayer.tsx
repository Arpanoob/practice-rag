import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Volume2,
  AlertTriangle,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { formatTimestamp } from "../utils/youtube";

import { VideoSummary } from "./VideoSummary";

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  seekTime?: number | null;
  onResetVideo?: () => void;
  onSeek?: (seconds: number) => void;
  initialSummary?: string;
}

export function VideoPlayer({
  videoId,
  videoUrl,
  seekTime,
  onResetVideo,
  onSeek,
  initialSummary,
}: Readonly<VideoPlayerProps>) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [manualTimestamp, setManualTimestamp] = useState<number | null>(null);
  // Default to youtube-nocookie to bypass third-party cookie & adblocker restrictions on localhost
  const [useNoCookie, setUseNoCookie] = useState(true);

  // Derived timestamp to display
  const displayTimestamp =
    manualTimestamp !== null ? manualTimestamp : (seekTime ?? null);

  // Scope postMessage to the active YouTube embed origin instead of "*".
  const baseDomain = useNoCookie
    ? "https://www.youtube-nocookie.com"
    : "https://www.youtube.com";

  // Send postMessage command to YouTube player API when seekTime changes
  useEffect(() => {
    if (seekTime === undefined || seekTime === null) return;

    const iframeWindow = iframeRef.current?.contentWindow;
    if (iframeWindow) {
      iframeWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seekTime, true],
        }),
        baseDomain
      );
      iframeWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: [],
        }),
        baseDomain
      );
    }
  }, [seekTime, baseDomain]);

  const handleRestart = () => {
    setManualTimestamp(0);
    const iframeWindow = iframeRef.current?.contentWindow;
    if (iframeWindow) {
      iframeWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [0, true],
        }),
        baseDomain
      );
    }
  };

  const startParam =
    displayTimestamp !== null && displayTimestamp > 0
      ? `&start=${Math.floor(displayTimestamp)}&autoplay=1`
      : "";

  // Clean embed URL without broken query parameters
  const iframeSrc = `${baseDomain}/embed/${videoId}?rel=0&playsinline=1${startParam}`;

  const directYouTubeUrl = `https://www.youtube.com/watch?v=${videoId}${
    displayTimestamp !== null && displayTimestamp > 0
      ? `&t=${Math.floor(displayTimestamp)}s`
      : ""
  }`;

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 border-r border-neutral-800/80 overflow-y-auto no-scrollbar">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/60 border-b border-neutral-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-600 text-white shrink-0">
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-200">
                YouTube Player
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/15 text-red-400 font-medium tracking-wide">
                INTERACTIVE
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-xs">
              {videoUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Domain toggle for troubleshooting */}
          <button
            type="button"
            onClick={() => setUseNoCookie(!useNoCookie)}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title={
              useNoCookie
                ? "Using Privacy-Enhanced Embed (youtube-nocookie.com). Click to switch."
                : "Using Standard Embed (youtube.com). Click to switch."
            }
          >
            {useNoCookie ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Privacy Mode</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3 text-blue-400" />
                <span>Standard Mode</span>
              </>
            )}
          </button>

          {onResetVideo && (
            <button
              type="button"
              onClick={onResetVideo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer"
              title="Change video"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Video</span>
            </button>
          )}

          <a
            href={directYouTubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors"
            title="Open directly on YouTube"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Player Container */}
      <div className="p-4 flex-1 flex flex-col justify-start">
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-neutral-800 relative group">
          <iframe
            key={`${baseDomain}-${videoId}`}
            ref={iframeRef}
            src={iframeSrc}
            title="YouTube video player"
            className="w-full h-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Current Seek Info & Status Banner */}
        <div className="mt-4 flex flex-col gap-3">
          {displayTimestamp !== null && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/80 animate-fade-in">
              <div className="flex items-center gap-2 text-xs">
                <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-neutral-400">Jumped to:</span>
                <span className="font-mono font-semibold text-neutral-100 bg-red-600/20 px-2 py-0.5 rounded text-red-400">
                  {formatTimestamp(displayTimestamp)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Restart
              </button>
            </div>
          )}

          {/* Video Summary Section directly below the video player */}
          <VideoSummary
            videoUrl={videoUrl}
            onSeek={onSeek}
            initialSummary={initialSummary}
          />

          {/* Quick Info & Embed Notice */}
          <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-xs text-neutral-400 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Smart Video Sync</span>
              </div>
              <a
                href={directYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] underline"
              >
                Open on YouTube ↗
              </a>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Click any timestamp badge in the summary or chat to jump straight to that moment in the video.
            </p>

            <div className="pt-2 border-t border-neutral-800/60 flex items-start gap-2 text-[11px] text-neutral-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-neutral-300 font-medium block">
                  Playback Error when clicking Play?
                </span>
                <span className="text-neutral-400 block leading-normal">
                  If the thumbnail loads but clicking play shows &quot;Playback ID error&quot;, your browser has an <strong>AdBlocker (uBlock, AdBlock)</strong> or <strong>Brave Shields</strong> actively blocking YouTube media telemetry. 
                  Turn off shields/adblocker for <code className="text-neutral-300 font-mono">localhost:5173</code>, or click the <strong className="text-neutral-300">&quot;Privacy Mode&quot;</strong> button above.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
