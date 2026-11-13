"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface Props {
  productId: string;
  packages: any[];
}

export function FreeDownloadButton({ productId, packages }: Props) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!isAuthenticated) {
      router.push(`/login?return=${window.location.pathname}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Create a free order (backend will auto-mark it as paid)
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: productId, package_id: packages[0]?.id || null, quantity: 1 }],
          is_free_checkout: true,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const order = await res.json();

      // 2. Fetch the download tokens generated for this order
      const tokenRes = await fetch(`${API_BASE}/orders/${order.id}/downloads`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!tokenRes.ok) throw new Error("Failed to generate download link");
      const tokens = await tokenRes.json();

      if (tokens && tokens.length > 0) {
        // 3. Trigger the browser download
        window.location.href = `${API_BASE}/downloads/${tokens[0].token}`;
      } else {
        throw new Error("No files found for this package.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22C58B] to-[#1ea877] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#22C58B]/20 hover:brightness-110 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
        {loading ? "Preparing Download..." : "Download Free Project"}
      </button>
      {error && <p className="text-sm text-[#F05D70] mt-2 text-center">{error}</p>}
    </div>
  );
}
