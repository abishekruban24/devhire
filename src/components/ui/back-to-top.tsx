"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackToTopProps {
  threshold?: number;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function BackToTop({
  threshold = 350,
  className,
  scrollContainerRef,
}: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const getScrollTop = () => {
      if (scrollContainerRef?.current) {
        return scrollContainerRef.current.scrollTop;
      }
      return typeof window !== "undefined" ? window.scrollY : 0;
    };

    const handleScroll = () => {
      setVisible(getScrollTop() > threshold);
    };

    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [threshold, scrollContainerRef]);

  const scrollToTop = () => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full",
        "bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-lg shadow-black/50 backdrop-blur-sm",
        "transition-all duration-300 hover:bg-slate-800 hover:text-white hover:border-blue-500/60 hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14]",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
        className
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
