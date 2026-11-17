interface AvatarProps {
  name?: string | null;
  size?: number; // px
  className?: string;
}

export function Avatar({ name, size = 40, className = "" }: AvatarProps) {
  const initials = name?.trim()
    ? name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] flex items-center justify-center text-white font-display font-bold flex-shrink-0 ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials}</span>
    </div>
  );
}
