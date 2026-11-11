"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/design-system/cn";
import { useCoursesFilter } from "@/lib/context/CoursesFilterContext";

interface TechItem {
  name: string;
  count: number;
}

const TECH_CONFIG: Record<string, { slug: string; color: string; fallbackIcon?: string }> = {
  "python": { slug: "python", color: "3776AB" },
  "javascript": { slug: "javascript", color: "F7DF1E" },
  "typescript": { slug: "typescript", color: "3178C6" },
  "java": { slug: "openjdk", color: "F89820" },
  "php": { slug: "php", color: "777BB4" },
  "c": { slug: "c", color: "A8B9CC" },
  "c++": { slug: "cplusplus", color: "00599C" },
  "c#": { slug: "dotnet", color: "239120" },
  "go": { slug: "go", color: "00ADD8" },
  "rust": { slug: "rust", color: "CE412B" },
  "kotlin": { slug: "kotlin", color: "7F52FF" },
  "swift": { slug: "swift", color: "F05138" },
  "ruby": { slug: "ruby", color: "CC342D" },
  "dart": { slug: "dart", color: "0175C2" },
  "html": { slug: "html5", color: "E34F26" },
  "html5": { slug: "html5", color: "E34F26" },
  "css": { slug: "css3", color: "1572B6" },
  "css3": { slug: "css3", color: "1572B6" },
  "react": { slug: "react", color: "61DAFB" },
  "react native": { slug: "react", color: "61DAFB" },
  "vue": { slug: "vuedotjs", color: "4FC08D" },
  "angular": { slug: "angular", color: "DD0031" },
  "next.js": { slug: "nextdotjs", color: "000000" },
  "nextjs": { slug: "nextdotjs", color: "000000" },
  "tailwind": { slug: "tailwindcss", color: "06B6D4" },
  "tailwind css": { slug: "tailwindcss", color: "06B6D4" },
  "bootstrap": { slug: "bootstrap", color: "7952B3" },
  "jquery": { slug: "jquery", color: "0769AD" },
  "sass": { slug: "sass", color: "CC6699" },
  "flutter": { slug: "flutter", color: "02569B" },
  "fastapi": { slug: "fastapi", color: "009688" },
  "django": { slug: "django", color: "092E20" },
  "flask": { slug: "flask", color: "000000" },
  "node.js": { slug: "nodedotjs", color: "339933" },
  "nodejs": { slug: "nodedotjs", color: "339933" },
  "express": { slug: "express", color: "000000" },
  "nest.js": { slug: "nestjs", color: "E0234E" },
  "laravel": { slug: "laravel", color: "FF2D20" },
  "spring": { slug: "spring", color: "6DB33F" },
  "graphql": { slug: "graphql", color: "E10098" },
  "postgresql": { slug: "postgresql", color: "4169E1" },
  "postgres": { slug: "postgresql", color: "4169E1" },
  "mysql": { slug: "mysql", color: "4479A1" },
  "sqlite": { slug: "sqlite", color: "003B57" },
  "mongodb": { slug: "mongodb", color: "47A248" },
  "redis": { slug: "redis", color: "DC382D" },
  "numpy": { slug: "numpy", color: "013243" },
  "pandas": { slug: "pandas", color: "150458" },
  "scikit-learn": { slug: "scikitlearn", color: "F7931E" },
  "tensorflow": { slug: "tensorflow", color: "FF6F00" },
  "pytorch": { slug: "pytorch", color: "EE4C2C" },
  "keras": { slug: "keras", color: "D00000" },
  "jupyter": { slug: "jupyter", color: "F37626" },
  "docker": { slug: "docker", color: "2496ED" },
  "kubernetes": { slug: "kubernetes", color: "326CE5" },
  "aws": { slug: "amazonaws", color: "232F3E" },
  "azure": { slug: "microsoftazure", color: "0078D4" },
  "gcp": { slug: "googlecloud", color: "4285F4" },
  "git": { slug: "git", color: "F05032" },
  "github": { slug: "github", color: "181717" },
  "git & github": { slug: "github", color: "181717" },
  "linux": { slug: "linux", color: "FCC624" },
  "nginx": { slug: "nginx", color: "009639" },
  "excel": { slug: "microsoftexcel", color: "217346" },
  "figma": { slug: "figma", color: "F24E1E" },
  "postman": { slug: "postman", color: "FF6C37" },
  "swagger": { slug: "swagger", color: "85EA2D" },
};

function normalize(name: string): string { return name.trim().toLowerCase(); }
function getLogoUrl(name: string): string | null {
  const cfg = TECH_CONFIG[normalize(name)];
  return cfg && cfg.slug ? `https://cdn.simpleicons.org/${cfg.slug}/${cfg.color}` : null;
}
function getColor(name: string): string {
  const cfg = TECH_CONFIG[normalize(name)];
  return cfg ? `#${cfg.color}` : "#7A8199";
}
function getBgTint(name: string): string { return `${getColor(name)}20`; }

export function TechnologyStrip() {
  const { activeTech, setActiveTech } = useCoursesFilter();
  const [technologies, setTechnologies] = useState<TechItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/courses/technologies`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTechnologies(Array.isArray(data) ? data : []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[#7A8199]">
        <Loader2 size={14} className="animate-spin" /> Loading technologies...
      </div>
    );
  }

  if (error || technologies.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      <button
        onClick={() => setActiveTech(null)}
        className={cn(
          "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap",
          activeTech === null
            ? "bg-[#7559E8] text-white border-[#7559E8]"
            : "bg-white/5 text-[#B7BDD0] border-white/5 hover:bg-white/10 hover:text-white"
        )}
      >
        All
      </button>

      {technologies.map((tech) => {
        const logoUrl = getLogoUrl(tech.name);
        const color = getColor(tech.name);
        const bgTint = getBgTint(tech.name);
        const isActive = activeTech === tech.name;

        return (
          <button
            key={tech.name}
            onClick={() => setActiveTech(isActive ? null : tech.name)}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition whitespace-nowrap",
              isActive
                ? "border-transparent text-white"
                : "border-white/5 hover:border-white/15 text-[#B7BDD0] hover:text-white"
            )}
            style={isActive ? { backgroundColor: color } : { backgroundColor: bgTint }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tech.name}
                className="w-4 h-4 flex-shrink-0"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9px] font-bold flex-shrink-0"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.2)" : `${color}40`,
                  color: isActive ? "#fff" : color,
                }}
              >
                {tech.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span>{tech.name}</span>
            <span className={cn("text-[10px] font-mono", isActive ? "text-white/80" : "text-[#7A8199]")}>
              {tech.count}
            </span>
            {isActive && <X size={11} className="ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}
