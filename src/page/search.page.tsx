import { useState } from "react";
import { Search } from "../components/search";
import { IngestionLoader, type IngestionResultPayload } from "../components/IngestionLoader";
import { VideoPlayer } from "../components/VideoPlayer";
import { ChatPanel } from "../components/ChatPanel";
import { ResizableSplitPane } from "../components/ResizableSplitPane";
import { type VideoSearchResult } from "../hooks/useSearch";
import { extractYouTubeVideoId } from "../utils/youtube";
import {
  Sparkles,
  Layers,
  Play,
  AlertCircle,
} from "lucide-react";

function YouTubeLogo({
  className = "w-4 h-4",
}: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const SAMPLE_VIDEOS = [
  {
    label: "Steve Jobs Stanford Speech",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    label: "3Blue1Brown: Neural Networks",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
  },
  {
    label: "Fireship: 100+ Computer Science Concepts",
    url: "https://www.youtube.com/watch?v=-uleG_Vecis",
  },
];

type ScreenState = "search" | "ingesting" | "workspace";

export function SearchPage() {
  const [screen, setScreen] = useState<ScreenState>("search");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [ingestionResult, setIngestionResult] =
    useState<VideoSearchResult | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);

  const handleStartIngestion = (urlToIngest: string) => {
    const trimmed = urlToIngest.trim();
    if (!trimmed) {
      setInputError("Please enter a YouTube video URL.");
      return;
    }

    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) {
      setInputError(
        "Invalid YouTube URL. Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=...)"
      );
      return;
    }

    setInputError(null);
    setActiveVideoUrl(trimmed);
    setActiveVideoId(videoId);
    setScreen("ingesting");
  };

  const handleIngestionComplete = (res: IngestionResultPayload) => {
    setIngestionResult({
      videoUrl: res.videoUrl,
      query: "Overview",
      answer:
        res.initialOverview ||
        res.message ||
        "Video indexed successfully in knowledge base.",
      summary: res.summary,
      relevantChunks: res.sampleChunks || [
        {
          text: "Video indexed successfully in knowledge base.",
          start: 0,
          duration: 30,
          score: 0.95,
        },
      ],
    });
    setScreen("workspace");
  };

  const handleSeek = (seconds: number) => {
    setSeekTimestamp(seconds);
  };

  const handleResetToSearch = () => {
    setScreen("search");
    setIngestionResult(null);
    setSeekTimestamp(null);
  };

  // Screen 2: Real-time Ingestion Loader Screen (SSE Streaming)
  if (screen === "ingesting") {
    return (
      <IngestionLoader
        videoUrl={activeVideoUrl}
        videoId={activeVideoId}
        onComplete={handleIngestionComplete}
        onCancel={handleResetToSearch}
      />
    );
  }

  // Screen 3: Two-Half Dynamic Split Screen (Video Player + Chat Screen)
  if (screen === "workspace" && activeVideoId) {
    return (
      <ResizableSplitPane
        defaultLeftWidth={52}
        minLeftWidth={25}
        maxLeftWidth={75}
        leftPane={
          <VideoPlayer
            videoId={activeVideoId}
            videoUrl={activeVideoUrl}
            seekTime={seekTimestamp}
            initialSummary={ingestionResult?.summary}
            onResetVideo={handleResetToSearch}
            onSeek={handleSeek}
          />
        }
        rightPane={
          <ChatPanel
            videoUrl={activeVideoUrl}
            initialData={ingestionResult}
            onSeek={handleSeek}
          />
        }
      />
    );
  }

  // Screen 1: Centered Search Screen
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 py-12 bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[620px] sm:h-[620px] bg-red-600/10 rounded-full blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs sm:text-sm font-medium text-neutral-300 shadow-sm backdrop-blur-md">
          <span className="text-red-500">
            <YouTubeLogo className="w-5 h-5" />
          </span>
          <span className="text-neutral-500">|</span>
          <span className="flex items-center gap-1.5 text-neutral-200">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            Smart Video Assistant
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Watch, Learn & Chat with Any{" "}
          <span className="bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            YouTube Video
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-sm sm:text-base text-neutral-400 max-w-lg mb-8 leading-relaxed">
          Paste any YouTube link to get instant summaries, find key moments, and ask questions about anything said in the video.
        </p>

        {/* Centered Search Bar */}
        <div className="w-full mb-4">
          <Search
            searchTerm={videoUrlInput}
            setSearchTerm={(term) => {
              setVideoUrlInput(term);
              if (inputError) setInputError(null);
            }}
            placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
            buttonText="Explore Video"
            onSearch={handleStartIngestion}
          />
        </div>

        {/* Input Validation Error */}
        {inputError && (
          <div className="w-full mb-6 flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{inputError}</span>
          </div>
        )}

        {/* Sample YouTube Links */}
        <div className="w-full flex flex-col items-center gap-2.5 mt-2">
          <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">
            Or try an example video
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
            {SAMPLE_VIDEOS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setVideoUrlInput(item.url);
                  handleStartIngestion(item.url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-900/70 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Play className="w-3 h-3 text-red-400 fill-current" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User-Friendly Benefit Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[12px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Answers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-red-400 fill-current" />
            <span>Click to Jump to Moments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>Smart Key Highlights</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Hints */}
      <footer className="absolute bottom-4 inset-x-0 text-center text-xs text-neutral-600">
        <span>Paste any YouTube link and press </span>
        <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono text-[10px]">
          Enter ↵
        </kbd>
        <span> to begin</span>
      </footer>
    </main>
  );
}
