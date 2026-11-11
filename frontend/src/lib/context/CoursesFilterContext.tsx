"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CoursesFilterContextType {
  activeTech: string | null;
  setActiveTech: (tech: string | null) => void;
}

const CoursesFilterContext = createContext<CoursesFilterContextType | undefined>(undefined);

export function CoursesFilterProvider({ children }: { children: ReactNode }) {
  const [activeTech, setActiveTech] = useState<string | null>(null);

  return (
    <CoursesFilterContext.Provider value={{ activeTech, setActiveTech }}>
      {children}
    </CoursesFilterContext.Provider>
  );
}

export function useCoursesFilter() {
  const context = useContext(CoursesFilterContext);
  if (!context) throw new Error("useCoursesFilter must be used within CoursesFilterProvider");
  return context;
}
