"use client";

import React, { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SnapCardsProps {
  /** An array of paths to the promotional images you want to display */
  imagePaths: string[];
}

export default function SnapCards({ imagePaths = [] }: SnapCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    setIsDarkMode(savedTheme !== "light");
  }, []);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.children.length > 0) {
      const scrollLeft = scrollRef.current.scrollLeft;
      // Dynamically get the width of the card + the 16px (gap-4) spacing
      const cardElement = scrollRef.current.children[0] as HTMLElement;
      const cardWidth = cardElement.offsetWidth;
      const gap = 16; 
      
      const index = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(index);
    }
  };

  // Do not render anything if no images are passed
  if (imagePaths.length === 0) return null;

  const totalCards = imagePaths.length;

  return (
    <div
      className={cn(
        "w-full py-4 font-sans transition-colors duration-500", // Reduced padding to save space
        isDarkMode ? "bg-transparent" : "bg-zinc-50/50"
      )}
    >
      <div className="px-3 mb-4 flex items-center justify-between">
        <h2
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em]",
            isDarkMode ? "text-zinc-500" : "text-zinc-400"
          )}
        >
          Promotions & Offers
        </h2>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-5 no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* --- PROMOTIONAL CARDS LOOP --- */}
        {imagePaths.map((imagePath, index) => (
          <div key={index} className="min-w-[85%] sm:min-w-[320px] snap-center">
            <Card
              className={cn(
                // Reduced height to 150px and added rounded-2xl for better conformity
                "group relative h-[220px] w-full overflow-hidden transition-all duration-500 shadow-md border-0 rounded-2xl",
                isDarkMode ? "bg-zinc-950" : "bg-white"
              )}
            >
              <img
                src={imagePath}
                alt={`Promotional Offer ${index + 1}`}
                // object-cover forces the image to perfectly fill the card without weird borders
                className="h-full w-full object-contain object-center" 
              />
            </Card>
          </div>
        ))}

        {/* Spacer for proper final scrolling */}
        <div className="min-w-[1px] pr-6" />
      </div>

      {/* --- DYNAMIC INDICATORS --- */}
      {/* Only show dots if there's more than 1 card */}
      {totalCards > 1 && (
        <div className="flex justify-center items-center gap-3 mt-2">
          {Array.from({ length: totalCards }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 rounded-full transition-all duration-500 ease-in-out",
                activeIndex === index
                  ? isDarkMode
                    ? "bg-white w-6" // Slightly smaller indicator dots to match smaller cards
                    : "bg-zinc-900 w-6"
                  : isDarkMode
                  ? "bg-zinc-800 w-2"
                  : "bg-zinc-300 w-2"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}