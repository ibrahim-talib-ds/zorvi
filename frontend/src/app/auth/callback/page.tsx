"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) { router.replace(`/login?error=${error}`); return; }
    if (!accessToken || !refreshToken) { router.replace("/login?error=missing_tokens"); return; }

    loginWithTokens(accessToken, refreshToken)
      .then(() => router.replace("/account"))
      .catch(() => router.replace("/login?error=oauth_failed"));
  }, [searchParams, loginWithTokens, router]);

  return (
    <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F1D]" />}>
      <Callback />
    </Suspense>
  );
}
