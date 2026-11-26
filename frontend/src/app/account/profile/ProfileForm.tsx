"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, Check } from "lucide-react";
import { API_BASE } from "@/lib/api/client";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  initialName: string;
  token: string;
  avatarUrl?: string | null;
  onAvatarUpdated: (user: { avatar_url: string | null }) => void;
  onNameUpdated: (name: string | null) => void;
}

export function ProfileForm({ initialName, token, avatarUrl, onAvatarUpdated, onNameUpdated }: Props) {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.trim()
    ? name.trim().split(/\s+/).map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  const handleAvatarFile = async (file?: File) => {
    if (!file || !token) return;
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2 MB."); return; }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Avatar upload failed.");
      onAvatarUpdated(body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Avatar upload failed.");
    } finally {
      setUploading(false);
      if (cameraInput.current) cameraInput.current.value = "";
      if (photoInput.current) photoInput.current.value = "";
    }
  };

  const handleSaveName = async () => {
    if (!token) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: name.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updatedUser = await res.json();
      onNameUpdated(updatedUser.full_name ?? null);
      setSaved(true); router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
        <div className="relative">
          <Avatar name={name || initials} src={avatarUrl} size={96} className="border-2 border-white/10 shadow-lg shadow-[#7559E8]/20" />
          <button type="button" onClick={() => cameraInput.current?.click()} disabled={uploading} aria-label="Take profile photo" className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0F1D] bg-[#7559E8] text-white hover:bg-[#8B70FF] disabled:opacity-60">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
          </button>
        </div>
        <div className="text-center sm:text-left mt-2 flex-1">
          <h3 className="text-lg font-display font-semibold text-white">Profile photo</h3>
          <p className="text-sm text-[#7A8199] max-w-sm mt-1">Take a photo with your camera or choose an image. JPG, PNG, or WebP; maximum 2 MB.</p>
          <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
            <button type="button" onClick={() => cameraInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">
              <Camera size={15} /> Take photo
            </button>
            <button type="button" onClick={() => photoInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">
              <ImagePlus size={15} /> Choose photo
            </button>
          </div>
          <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(e) => void handleAvatarFile(e.target.files?.[0])} />
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleAvatarFile(e.target.files?.[0])} />
        </div>
      </div>

      <div className="border-t border-white/5 pt-6">
        <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Full Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-md px-4 py-3 rounded-lg bg-[#0B0F1D] border border-white/10 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] transition" placeholder="e.g. Ibrahim Talib" />
      </div>

      <div className="flex items-center gap-4 pt-2 flex-wrap">
        <button onClick={handleSaveName} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#7559E8] hover:bg-[#8B70FF] text-white font-medium text-sm transition flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Changes
        </button>
        {saved && <span className="text-sm text-[#22C58B]">Saved successfully!</span>}
        {error && <span role="alert" className="text-sm text-[#F05D70]">{error}</span>}
      </div>
    </div>
  );
}
