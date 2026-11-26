"use client";

import { useState } from "react";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number; // px
  className?: string;
}

export function Avatar({ name, src, size = 40, className = "" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name?.trim()
    ? name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "U";

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative overflow-hidden rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] flex items-center justify-center text-white font-display font-bold flex-shrink-0 ${className}`}
    >
      {src && src !== failedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${name || "User"} avatar`} className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      )}
    </div>
  );
}
