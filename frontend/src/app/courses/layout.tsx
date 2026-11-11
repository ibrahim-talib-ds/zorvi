"use client";

import { TechnologyStrip } from "@/components/courses/TechnologyStrip";
import { CoursesFilterProvider } from "@/lib/context/CoursesFilterContext";

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CoursesFilterProvider>
      <div className="min-h-screen bg-[#0B0F1D]">
        {/* Sub-nav: sits perfectly under the main header */}
        <div className="sticky top-16 md:top-[72px] z-30 border-b border-white/5 bg-[#0B0F1D]/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <TechnologyStrip />
          </div>
        </div>

        {/* Page content */}
        <div className="relative">
          {children}
        </div>
      </div>
    </CoursesFilterProvider>
  );
}
