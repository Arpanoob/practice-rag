export interface VideoTranscriptChunk {
  text: string;
  start: number;
  duration: number;
  score?: number;
}

export interface VideoSearchResult {
  videoUrl: string;
  query: string;
  answer?: string;
  summary?: string;
  relevantChunks: VideoTranscriptChunk[];
}

export interface SearchParams {
  videoUrl: string;
  query: string;
}

export interface SearchApiResponse {
  success: boolean;
  message?: string;
  data?: VideoSearchResult;
  error?: string;
}

export interface UseSearchOptions {
  endpoint?: string;
  defaultVideoUrl?: string;
}

export interface UseSearchResult {
  data: VideoSearchResult | null;
  isLoading: boolean;
  error: string | null;
  search: (
    paramsOrQuery: SearchParams | string,
    optionalVideoUrl?: string
  ) => Promise<VideoSearchResult | null>;
  reset: () => void;
  abort: () => void;
}

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface SearchParams {
  videoUrl: string;
  query: string;
  history?: ChatHistoryItem[];
}