"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { API_BASE } from "@/lib/api/client";

interface Props {
  initialName: string;
  token: string;
}

export function ProfileForm({ initialName, token }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.trim()
    ? name.trim().split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7559E8] to-[#8B70FF] flex items-center justify-center shadow-lg shadow-[#7559E8]/20 border-2 border-white/10">
          <span className="text-3xl font-display font-extrabold text-white tracking-widest">
            {initials}
          </span>
        </div>
        <div className="text-center sm:text-left mt-2">
          <h3 className="text-lg font-display font-semibold text-white">Profile Identity</h3>
          <p className="text-sm text-[#7A8199] max-w-xs mt-1">
            Your initials are automatically generated from your full name.
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 pt-6">
        <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-md px-4 py-3 rounded-lg bg-[#0B0F1D] border border-white/10 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8] transition"
          placeholder="e.g. Ibrahim Talib"
        />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSaveName}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#7559E8] hover:bg-[#8B70FF] text-white font-medium text-sm transition flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Save Changes
        </button>
        {saved && <span className="text-sm text-[#22C58B]">Saved successfully!</span>}
        {error && <span className="text-sm text-[#F05D70]">{error}</span>}
      </div>
    </div>
  );
}
