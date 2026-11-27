export const COURSE_LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "beginner_to_intermediate", label: "Beginner to Intermediate" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
] as const;

const COURSE_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  COURSE_LEVEL_OPTIONS.map(({ value, label }) => [value, label]),
);

export function getCourseLevelLabel(value: string | null | undefined): string {
  if (!value) return "";
  return COURSE_LEVEL_LABELS[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
