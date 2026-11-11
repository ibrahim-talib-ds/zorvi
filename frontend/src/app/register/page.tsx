"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Register
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, email: email.trim(), password }),
      });

      if (!regRes.ok) {
        const data = await regRes.json();
        throw new Error(data.detail || "Registration failed");
      }

      // 2. Auto Login
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) throw new Error("Account created, but auto-login failed. Please log in manually.");

      const data = await loginRes.json();
      await login(data.access_token, data.refresh_token);
      
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            <h1 className="font-display text-3xl font-extrabold text-white mb-2">Create an account</h1>
            <p className="text-sm text-[#B7BDD0]">Join ZORVI to learn and build.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 text-sm text-[#F05D70] text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ibrahim Talib"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-10 pr-4 py-3 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-10 pr-4 py-3 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8199]" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] pl-10 pr-12 py-3 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8199] hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] py-3 font-semibold text-white hover:brightness-110 transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign Up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#7A8199]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#A78BFA] hover:text-white transition font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
