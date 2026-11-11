"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return") || "/account";
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const passwordInput = document.getElementById("login-password") as HTMLInputElement;
    if (!emailInput || !passwordInput) return;
    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value;
    if (!emailValue || !passwordValue) {
      setError("Please fill in both email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(emailValue, passwordValue);
      router.push(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#7A8199] hover:text-white mb-8 transition">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="rounded-2xl border border-white/10 bg-[#11152A] p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-extrabold text-white mb-2">Welcome back</h1>
            <p className="text-sm text-[#B7BDD0]">Log in to your ZORVI account.</p>
          </div>
          {error && (
            <div className="mb-6 p-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 text-sm text-[#F05D70] text-center">
              {error}
            </div>
          )}
          <div className="space-y-3 mb-6">
            <button type="button" className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Continue with Google
            </button>
            <button type="button" className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              Continue with GitHub
            </button>
          </div>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-[#11152A] px-2 text-[#7A8199]">OR</span></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" size={18} />
                <input id="login-email" type="email" required placeholder="you@example.com" className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-10 pr-4 py-3 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" size={18} />
                <input id="login-password" type={showPassword ? "text" : "password"} required placeholder="••••••••" className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-10 pr-12 py-3 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8199] hover:text-white transition">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-50 flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin" size={20} /> : "Log In"}</button>
          </form>
          <p className="mt-8 text-center text-sm text-[#7A8199]">Don&apos;t have an account? <Link href="/register" className="text-[#A78BFA] hover:text-white transition font-medium">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
