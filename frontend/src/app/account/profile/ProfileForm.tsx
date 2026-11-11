"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Props {
  initialName: string;
  initialAvatarUrl: string | null;
}

export function ProfileForm({ initialName, initialAvatarUrl }: Props) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be under 2 MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: name.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div>
        <label className="block text-sm font-medium text-[#B7BDD0] mb-3">
          Profile picture
        </label>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-[#7559E8]/20 hover:border-[#7559E8]/60 transition group"
          >
            {avatarUrl ? (
              <img
                src={`http://127.0.0.1:8010${avatarUrl}`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full font-display text-2xl font-bold text-[#A78BFA]">
                {initials}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              {uploading ? (
                <Loader2 size={24} className="text-white animate-spin" />
              ) : (
                <Camera size={24} className="text-white" />
              )}
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm font-medium text-[#A78BFA] hover:text-[#8B70FF] transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : avatarUrl ? "Change picture" : "Upload picture"}
            </button>
            <p className="text-xs text-[#7A8199] mt-1">JPG, PNG or WebP · Max 2 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-[#B7BDD0] mb-2">
          Full name
        </label>
        <div className="flex gap-2">
          <input
            id="fullName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            maxLength={120}
            className="flex-1 bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={saving || name === initialName}
            className="px-5 rounded-lg bg-[#7559E8] text-white text-sm font-semibold hover:bg-[#8B70FF] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Saved
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 p-3">
          <p className="text-sm text-[#F05D70]">{error}</p>
        </div>
      )}
    </div>
  );
}
