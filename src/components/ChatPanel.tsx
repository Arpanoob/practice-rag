import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Clock,
  Play,
  RotateCcw,
} from "lucide-react";
import { formatTimestamp, parseTimestamp } from "../utils/youtube";
import { useSearch, type VideoSearchResult } from "../hooks/useSearch";

export interface ChatTimestampCitation {
  timeSeconds: number;
  label?: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  citations?: ChatTimestampCitation[];
}

/**
 * Parses inline text formatting:
 * - Timestamps: [0:04], [1:28] -> clickable jump buttons
 * - Bold: **text** -> <strong>
 * - Code: `code` -> <code>
 * - Italic: *text* -> <em>
 */
function renderInlineSegments(
  text: string,
  onSeek: (seconds: number) => void
): React.ReactNode[] {
  const regex =
    /(\[(\d{1,2}:\d{2}(?::\d{2})?)\])|(\*\*(.+?)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }

    if (match[1]) {
      const timeStr = match[2];
      const seconds = parseTimestamp(timeStr);
      nodes.push(
        <button
          key={`inline-ts-${match.index}`}
          type="button"
          onClick={() => seconds !== null && onSeek(seconds)}
          className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 hover:border-red-500/70 text-red-400 hover:text-red-300 font-mono text-[11px] font-semibold transition-all cursor-pointer align-baseline shadow-xs active:scale-95"
          title={`Jump video to ${timeStr}`}
        >
          <Play className="w-2.5 h-2.5 fill-current shrink-0" />
          <span>{timeStr}</span>
        </button>
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={`inline-b-${match.index}`} className="font-bold text-neutral-100">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      nodes.push(
        <code
          key={`inline-code-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-neutral-800 text-red-300 font-mono text-xs border border-neutral-700/60"
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      nodes.push(
        <em key={`inline-em-${match.index}`} className="italic text-neutral-200">
          {match[8]}
        </em>
      );
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes;
}

/**
 * Formats multi-line bot responses with numbered lists, bullet lists,
 * bold tags, headers, and clickable timestamps.
 */
function FormattedChatMessage({
  text,
  onSeek,
  isUser,
}: {
  text: string;
  onSeek: (seconds: number) => void;
  isUser: boolean;
}) {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
      {lines.map((line, idx) => {
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
              className="pt-2 pb-0.5 font-bold text-neutral-100 text-sm tracking-wide"
            >
              {renderInlineSegments(title, onSeek)}
            </div>
          );
        }

        // Header 2 (##)
        if (trimmed.startsWith("##")) {
          const title = trimmed.replace(/^##\s*/, "");
          return (
            <div
              key={idx}
              className="pt-2.5 pb-0.5 font-extrabold text-white text-base tracking-wide"
            >
              {renderInlineSegments(title, onSeek)}
            </div>
          );
        }

        // Numbered list item: e.g. "1. **The Beginning of Apple**:"
        const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(trimmed);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const content = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 pt-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold shrink-0 mt-0.5">
                {num}
              </span>
              <div className="flex-1 min-w-0 leading-relaxed">
                {renderInlineSegments(content, onSeek)}
              </div>
            </div>
          );
        }

        // Bullet list item: e.g. "- He recounts..." or "* text"
        const bulletMatch = /^[-*•]\s+(.*)$/.exec(trimmed);
        if (bulletMatch) {
          const content = bulletMatch[1];
          return (
            <div key={idx} className="flex items-start gap-2 pl-3 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
              <div className="flex-1 min-w-0 leading-relaxed">
                {renderInlineSegments(content, onSeek)}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineSegments(line, onSeek)}
          </p>
        );
      })}
    </div>
  );
}

interface ChatPanelProps {
  videoUrl: string;
  initialData?: VideoSearchResult | null;
  onSeek: (seconds: number) => void;
}

export function ChatPanel({
  videoUrl,
  initialData,
  onSeek,
}: Readonly<ChatPanelProps>) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Generate initial welcome message
    const initialCitations: ChatTimestampCitation[] =
      initialData?.relevantChunks?.map((chunk) => ({
        timeSeconds: chunk.start,
        label: formatTimestamp(chunk.start),
        snippet: chunk.text,
      })) || [
        {
          timeSeconds: 0,
          label: "0:00",
          snippet: "Video Introduction & Start",
        },
        {
          timeSeconds: 120,
          label: "2:00",
          snippet: "Main topic overview & concepts",
        },
      ];

    return [
      {
        id: "msg-welcome",
        sender: "bot",
        text: initialData?.answer
          ? `Here is a quick overview of what this video covers:\n\n${initialData.answer}`
          : "Hello! I've gone through this video for you. Ask me anything about what's discussed, or ask when any topic starts!",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        citations: initialCitations,
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { search, isLoading } = useSearch({
    defaultVideoUrl: videoUrl,
  });
  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const history = messages
        .filter((m) => !m.id.startsWith("msg-welcome"))
        .map((m) => ({
          role: (m.sender === "user" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: m.text,
        }));

      // Call backend POST /api/ask
      const result = await search({
        videoUrl,
        query,
        history,
      });
      // A null result means the request failed or was aborted. Never fabricate
      // an answer or timestamps — surface an honest message instead.
      if (!result) {
        const failMessage: ChatMessage = {
          id: `bot-fail-${Date.now()}`,
          sender: "bot",
          text: "I couldn't find an answer for that right now. Please try rephrasing your question, or make sure the video has finished processing.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, failMessage]);
        return;
      }

      const botText =
        result.answer ||
        `I couldn't find relevant content in the transcript for: "${query}".`;
      const citations: ChatTimestampCitation[] = (
        result.relevantChunks ?? []
      ).map((chunk) => ({
        timeSeconds: chunk.start,
        label: formatTimestamp(chunk.start),
        snippet: chunk.text,
      }));

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        citations: citations.length > 0 ? citations : undefined,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: "bot",
        text: "Sorry, I had trouble querying the knowledge base. Please check if the backend server is running.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "msg-welcome-reset",
        sender: "bot",
        text: "Chat cleared! Ask any question about this video or where specific topics start.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/60 border-b border-neutral-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-800 text-red-500 border border-neutral-700/80 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-200">
                AI Video Assistant
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ready to Help
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Ask questions • Jump directly to video moments
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
          title="Clear conversation"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((message) => {
          const isUser = message.sender === "user";

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5 ${
                  isUser
                    ? "bg-red-600 text-white"
                    : "bg-neutral-800 text-red-400 border border-neutral-700"
                }`}
              >
                {isUser ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col max-w-[85%] ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-tr-none"
                      : "bg-neutral-900/90 border border-neutral-800 text-neutral-200 rounded-tl-none"
                  }`}
                >
                  <FormattedChatMessage
                    text={message.text}
                    onSeek={onSeek}
                    isUser={isUser}
                  />

                  {/* Clickable Timestamp Citations / Jump Badges */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
                        <Clock className="w-3 h-3 text-red-400" />
                        <span>Jump to these moments:</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {message.citations.map((cite, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onSeek(cite.timeSeconds)}
                            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-neutral-950/80 hover:bg-red-600/20 border border-neutral-800 hover:border-red-500/50 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                            title={
                              cite.snippet ||
                              `Jump to ${formatTimestamp(cite.timeSeconds)}`
                            }
                          >
                            <Play className="w-3 h-3 text-red-400 group-hover:text-red-300 fill-current" />
                            <span className="font-semibold text-red-400 group-hover:text-red-300">
                              {cite.label || formatTimestamp(cite.timeSeconds)}
                            </span>
                            {cite.snippet && (
                              <span className="text-[11px] text-neutral-400 max-w-[120px] truncate hidden sm:inline">
                                • {cite.snippet}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp footer */}
                <span className="text-[10px] text-neutral-500 mt-1 px-1">
                  {message.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator when bot is generating */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-800 text-red-400 border border-neutral-700 shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs rounded-tl-none flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span>Finding the best answer in the video...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-neutral-900/30 border-t border-neutral-800/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Sparkles className="w-3 h-3 text-neutral-500 shrink-0" />
        <span className="text-[11px] text-neutral-500 shrink-0">Try:</span>
        <button
          type="button"
          onClick={() =>
            handleSendMessage(
              "In which time in video does the main topic start?",
            )
          }
          className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 shrink-0 cursor-pointer transition-colors"
        >
          When does main topic start?
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage("Summarize the key takeaways")}
          className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 shrink-0 cursor-pointer transition-colors"
        >
          Summarize takeaways
        </button>
        <button
          type="button"
          onClick={() =>
            handleSendMessage("Give me a list of all timestamps and chapters")
          }
          className="px-2 py-0.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 shrink-0 cursor-pointer transition-colors"
        >
          List video chapters
        </button>
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-neutral-900/80 border-t border-neutral-800/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 focus-within:border-red-500/70 focus-within:ring-2 focus-within:ring-red-500/15 rounded-xl px-3 py-1.5 transition-all shadow-inner">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this video (e.g., 'When does he explain...')"
            className="flex-1 bg-transparent text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 outline-none"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center justify-center p-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
            title="Send question"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
