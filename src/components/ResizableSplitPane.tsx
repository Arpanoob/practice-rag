import React, { useState, useRef, useEffect, useCallback } from "react";
import { GripVertical } from "lucide-react";

interface ResizableSplitPaneProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  defaultLeftWidth?: number; // In percentage (e.g., 50)
  minLeftWidth?: number; // In percentage (e.g., 25)
  maxLeftWidth?: number; // In percentage (e.g., 75)
}

export function ResizableSplitPane({
  leftPane,
  rightPane,
  defaultLeftWidth = 50,
  minLeftWidth = 25,
  maxLeftWidth = 75,
}: Readonly<ResizableSplitPaneProps>) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const newPercent = (currentX / rect.width) * 100;
      const clamped = Math.min(Math.max(newPercent, minLeftWidth), maxLeftWidth);
      setLeftWidth(clamped);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = e.touches[0].clientX - rect.left;
      const newPercent = (currentX / rect.width) * 100;
      const clamped = Math.min(Math.max(newPercent, minLeftWidth), maxLeftWidth);
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handleDoubleClick = () => {
    // Reset to 50/50 on double click
    setLeftWidth(50);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen overflow-hidden flex flex-col md:flex-row bg-neutral-950 ${
        isDragging ? "select-none cursor-col-resize" : ""
      }`}
    >
      {/* Invisible overlay while dragging to prevent iframe from trapping mouse events */}
      {isDragging && (
        <div className="absolute inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* Left Pane (Video Player) */}
      <div
        style={{ width: `${leftWidth}%` }}
        className="h-1/2 md:h-full overflow-hidden transition-none w-full md:w-auto"
      >
        {leftPane}
      </div>

      {/* Draggable Divider Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        title="Drag cursor to resize halves (Double-click to reset 50/50)"
        className={`group relative z-40 hidden md:flex items-center justify-center w-2 -mx-1 hover:w-3 cursor-col-resize transition-all ${
          isDragging
            ? "bg-red-500/80 shadow-lg shadow-red-500/40"
            : "hover:bg-red-500/50 bg-neutral-900 border-x border-neutral-800"
        }`}
      >
        <div
          className={`flex items-center justify-center w-4 h-8 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 group-hover:text-white transition-colors shadow-md ${
            isDragging ? "bg-red-600 border-red-500 text-white" : ""
          }`}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      </div>

      {/* Right Pane (Chat Screen) */}
      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="h-1/2 md:h-full overflow-hidden transition-none flex-1"
      >
        {rightPane}
      </div>
    </div>
  );
}
