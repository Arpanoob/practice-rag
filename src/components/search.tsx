import React, { useState } from "react";
import { Search as SearchIcon, X, ArrowRight } from "lucide-react";

export interface SearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch?: (term: string) => void;
  placeholder?: string;
  buttonText?: string;
  isLoading?: boolean;
}

export function Search({
  searchTerm,
  setSearchTerm,
  onSearch,
  placeholder = "Paste YouTube video link (e.g. https://www.youtube.com/watch?v=...)",
  buttonText = "Analyze",
  isLoading = false,
}: Readonly<SearchProps>) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onSearch) {
      onSearch(searchTerm.trim());
    }
  };

  const handleClear = () => {
    setSearchTerm("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto transition-all duration-300"
      role="search"
    >
      <div
        className={`group relative flex items-center w-full rounded-2xl bg-neutral-900/90 backdrop-blur-xl border p-2 transition-all duration-300 shadow-2xl ${
          isFocused
            ? "border-red-500/70 ring-4 ring-red-500/20 shadow-red-500/10 bg-neutral-900"
            : "border-neutral-800 hover:border-neutral-700/80 shadow-black/50"
        }`}
      >
        {/* Left Search Icon */}
        <div className="flex items-center justify-center pl-3.5 pr-2 text-neutral-400 group-hover:text-red-400 transition-colors">
          <SearchIcon className="w-5 h-5 transition-transform duration-200 group-focus-within:scale-110" />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-2 py-2 text-sm md:text-base text-neutral-100 placeholder-neutral-500 outline-none focus:outline-none"
        />

        {/* Clear & Submit Action Buttons */}
        <div className="flex items-center gap-1.5 pr-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Clear input"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !searchTerm.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-600/25 hover:shadow-red-500/35 active:scale-95 transition-all cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">{buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
