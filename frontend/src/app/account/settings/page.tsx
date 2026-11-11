"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Lock, AlertTriangle, Loader2, Check, Eye, EyeOff, Trash2, Mail, User as UserIcon, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?return=/account/settings");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setUserInfo(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setChangingPassword(true);
    try {
      // Verify current password by attempting a login
      const verifyRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userInfo?.email, password: currentPassword }),
      });

      if (!verifyRes.ok) {
        throw new Error("Current password is incorrect");
      }

      // Change password via admin endpoint (using self-update)
      const changeRes = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!changeRes.ok) {
        const err = await changeRes.text();
        throw new Error(err || "Failed to change password");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      // Soft-delete: mark user as deleted via PATCH
      const res = await fetch(`${API_BASE}/users/me/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to delete account");
      }

      // Log out and redirect
      logout();
      router.replace("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1D] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }
  if (!isAuthenticated || !userInfo) return null;

  const joinedDate = new Date(userInfo.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0B0F1D] py-16">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/account/profile"
          className="inline-flex items-center gap-1.5 text-sm text-[#7A8199] hover:text-[#A78BFA] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Profile
        </Link>

        <div className="mb-10">
          <h1 className="font-display text-3xl font-extrabold text-white mb-1">Settings</h1>
          <p className="text-sm text-[#B7BDD0]">Manage your account, password, and privacy.</p>
        </div>

        {/* Account info */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 mb-6">
          <h2 className="font-display text-lg font-bold text-white mb-5">Account information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-[#7A8199]" />
              <div>
                <div className="text-xs text-[#7A8199]">Email</div>
                <div className="text-sm text-white">{userInfo.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon size={18} className="text-[#7A8199]" />
              <div>
                <div className="text-xs text-[#7A8199]">Full name</div>
                <div className="text-sm text-white">{userInfo.full_name || "Not set"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-[#7A8199]" />
              <div>
                <div className="text-xs text-[#7A8199]">Member since</div>
                <div className="text-sm text-white">{joinedDate}</div>
              </div>
            </div>
          </div>
          <Link
            href="/account/profile"
            className="inline-block mt-6 text-sm font-medium text-[#A78BFA] hover:text-[#8B70FF] transition"
          >
            Edit profile →
          </Link>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={18} className="text-[#A78BFA]" />
            <h2 className="font-display text-lg font-bold text-white">Change password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8199] hover:text-white"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8199] hover:text-white"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#7559E8]"
                placeholder="Repeat new password"
              />
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/10 p-3">
                <AlertTriangle size={16} className="text-[#F05D70] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#F05D70]">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-[#22C58B]/30 bg-[#22C58B]/10 p-3">
                <Check size={16} className="text-[#22C58B]" />
                <p className="text-sm text-[#22C58B]">Password changed successfully</p>
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {changingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Updating...
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-[#F05D70]/30 bg-[#F05D70]/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-[#F05D70]" />
            <h2 className="font-display text-lg font-bold text-[#F05D70]">Danger zone</h2>
          </div>
          <p className="text-sm text-[#B7BDD0] mb-4">
            Permanently delete your account. This action cannot be undone. Your courses, orders,
            and progress will be lost.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F05D70]/40 bg-transparent px-4 py-2 text-sm font-medium text-[#F05D70] hover:bg-[#F05D70]/10 transition"
            >
              <Trash2 size={14} /> Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#F05D70] font-medium">
                Type <span className="font-mono bg-[#F05D70]/20 px-2 py-0.5 rounded">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-[#0B0F1D] border border-[#F05D70]/30 rounded-lg px-4 py-2 text-white placeholder-[#7A8199] focus:outline-none focus:border-[#F05D70]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="rounded-lg bg-[#F05D70] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E04C5F] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    "Delete permanently"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
