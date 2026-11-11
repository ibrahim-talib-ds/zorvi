import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  thumbnail_url: string | null;
  cover_image_url?: string | null;
  difficulty: string;
  technologies: string[];
  learning_path: string | null;
  estimated_hours: number;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "border-[#22C58B]/30 bg-[#22C58B]/10 text-[#22C58B]",
  intermediate: "border-[#5B9EFF]/30 bg-[#5B9EFF]/10 text-[#5B9EFF]",
  advanced: "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]",
  expert: "border-[#F05D70]/30 bg-[#F05D70]/10 text-[#F05D70]",
};

export function CourseCard({ course }: { course: CourseListItem }) {
  const image = course.cover_image_url || course.thumbnail_url;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all hover:border-[#7559E8]/40 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-xl hover:shadow-[#7559E8]/10"
    >
      {/* Cover Image — smaller aspect ratio */}
      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#171B33] to-[#0B0F1D] flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={course.title}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <span className="text-5xl font-extrabold text-[#7559E8]/30 group-hover:text-[#7559E8]/50 transition duration-500">
              {course.title.charAt(0)}
            </span>
          </div>
        )}
        {course.is_featured && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#F5A623] text-[9px] font-bold uppercase tracking-wider text-black">
            Featured
          </span>
        )}
      </div>

      {/* Compact Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${DIFFICULTY_COLORS[course.difficulty] || DIFFICULTY_COLORS.beginner}`}>
            {course.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-[#7A8199]">
            <Clock size={10} /> ~{course.estimated_hours}h
          </span>
        </div>

        <h3 className="font-display text-base font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-[#A78BFA] transition">
          {course.title}
        </h3>

        <p className="text-xs text-[#B7BDD0] mb-3 line-clamp-2 flex-1">
          {course.short_description}
        </p>

        {/* Tech pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          {course.technologies?.slice(0, 3).map((tech) => (
            <span key={tech} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-[#7A8199] border border-white/5">
              {tech}
            </span>
          ))}
          {course.technologies && course.technologies.length > 3 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-[#7A8199]">+{course.technologies.length - 3}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-xs font-semibold text-[#A78BFA]">Start learning</span>
          <ArrowRight size={14} className="text-[#A78BFA] group-hover:translate-x-1 transition" />
        </div>
      </div>
    </Link>
  );
}
