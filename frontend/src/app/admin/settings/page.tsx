"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Check, Globe, Mail, CreditCard, Landmark, Scale, DollarSign, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { fetchWithAuth } from "@/lib/auth/AuthContext";
import { API_BASE } from "@/lib/api/client";

export default function AdminSettingsPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Branding
    site_name: "ZORVI",
    site_tagline: "Learn. Create. Launch.",
    site_description: "Premium full-stack academy and marketplace.",
    logo_url: "",
    // Contact
    support_email: "support@zorvi.com",
    support_phone: "",
    contact_address: "",
    // Payments — Stripe
    stripe_publishable_key: "",
    stripe_secret_key: "",
    stripe_enabled: true,
    // Payments — Bank Transfer
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    bank_swift_code: "",
    bank_enabled: true,
    // Currency
    default_currency: "USD",
    // Legal
    terms_url: "/terms",
    privacy_url: "/privacy",
    refund_url: "/refund",
    // Notifications
    email_notifications_enabled: true,
    // Maintenance
    maintenance_mode: false,
  });

  useEffect(() => {
    if (authLoading || !token) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/admin/settings`, {});
        if (res.ok) {
          const data = await res.json();
          // Backend returns { settings: [{ key, value, description }, ...] }
          if (data && Array.isArray(data.settings)) {
            const flat: Record<string, string> = {};
            data.settings.forEach((item: any) => {
              flat[item.key] = item.value;
            });
            setForm((prev) => ({ ...prev, ...flat }));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, authLoading]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#A78BFA]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#7A8199] hover:text-white mb-6 transition">
        <ArrowLeft size={16} /> Back to Admin
      </Link>

      <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white">Platform Settings</h1>
          <p className="text-[#B7BDD0] mt-1">Configure every aspect of your platform.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-[#22C58B]/30 bg-[#22C58B]/10 p-4 text-sm text-[#22C58B] flex items-center gap-2">
          <Check size={16} /> Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-[#F05D70]/30 bg-[#F05D70]/10 p-4 text-sm text-[#F05D70]">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* BRANDING */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#7559E8]/10 flex items-center justify-center">
              <Globe size={20} className="text-[#A78BFA]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Branding</h2>
              <p className="text-xs text-[#7A8199]">Site identity and metadata</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Site Name</label>
              <input
                type="text" value={form.site_name}
                onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Tagline</label>
              <input
                type="text" value={form.site_tagline}
                onChange={(e) => setForm({ ...form, site_tagline: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Site Description (SEO)</label>
            <textarea
              value={form.site_description}
              onChange={(e) => setForm({ ...form, site_description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Logo URL (optional)</label>
            <input
              type="url" value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>
        </section>

        {/* CONTACT */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#5B9EFF]/10 flex items-center justify-center">
              <Mail size={20} className="text-[#5B9EFF]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Contact</h2>
              <p className="text-xs text-[#7A8199]">How users reach you</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Support Email</label>
              <input
                type="email" value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Phone (optional)</label>
              <input
                type="tel" value={form.support_phone}
                onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
                placeholder="+255 700 000 000"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Business Address (optional)</label>
            <input
              type="text" value={form.contact_address}
              onChange={(e) => setForm({ ...form, contact_address: e.target.value })}
              placeholder="123 Main St, Dar es Salaam, Tanzania"
              className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
            />
          </div>
        </section>

        {/* STRIPE PAYMENTS */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5B9EFF]/10 flex items-center justify-center">
                <CreditCard size={20} className="text-[#5B9EFF]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-lg">Stripe Payments</h2>
                <p className="text-xs text-[#7A8199]">Accept cards worldwide (Visa, Mastercard, Amex)</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.stripe_enabled}
                onChange={(e) => setForm({ ...form, stripe_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#22C58B]"
              />
              <span className="text-sm text-white font-medium">Enabled</span>
            </label>
          </div>

          <div className="rounded-lg border border-[#5B9EFF]/20 bg-[#5B9EFF]/5 p-4 mb-2">
            <p className="text-xs text-[#B7BDD0] leading-relaxed">
              💡 <strong className="text-white">Why Stripe?</strong> 2.9% + $0.30 per transaction. No monthly fees. Supports 135+ currencies. Payouts in 7 days. Get keys at{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-[#5B9EFF] hover:underline">
                dashboard.stripe.com/apikeys
              </a>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Publishable Key (pk_...)</label>
              <input
                type="text" value={form.stripe_publishable_key}
                onChange={(e) => setForm({ ...form, stripe_publishable_key: e.target.value })}
                placeholder="pk_live_..."
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Secret Key (sk_...)</label>
              <input
                type="password" value={form.stripe_secret_key}
                onChange={(e) => setForm({ ...form, stripe_secret_key: e.target.value })}
                placeholder="sk_live_..."
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* BANK TRANSFER */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#22C58B]/10 flex items-center justify-center">
                <Landmark size={20} className="text-[#22C58B]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-lg">Bank Transfer</h2>
                <p className="text-xs text-[#7A8199]">Manual verification (0% fees)</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={form.bank_enabled}
                onChange={(e) => setForm({ ...form, bank_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#22C58B]"
              />
              <span className="text-sm text-white font-medium">Enabled</span>
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Bank Name</label>
              <input
                type="text" value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="CRDB Bank / NMB / Equity"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Account Holder Name</label>
              <input
                type="text" value={form.bank_account_holder}
                onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
                placeholder="Your full name"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Account Number</label>
              <input
                type="text" value={form.bank_account_number}
                onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                placeholder="1234567890"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">SWIFT / BIC (International)</label>
              <input
                type="text" value={form.bank_swift_code}
                onChange={(e) => setForm({ ...form, bank_swift_code: e.target.value })}
                placeholder="CORUTZTZ"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* CURRENCY */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center">
              <DollarSign size={20} className="text-[#F5A623]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Currency</h2>
              <p className="text-xs text-[#7A8199]">Default currency for all prices</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Default Currency</label>
              <select
                value={form.default_currency}
                onChange={(e) => setForm({ ...form, default_currency: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white focus:border-[#7559E8] focus:outline-none"
              >
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="TZS">TZS — Tanzanian Shilling</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="NGN">NGN — Nigerian Naira</option>
              </select>
            </div>
          </div>
        </section>

        {/* LEGAL */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#A78BFA]/10 flex items-center justify-center">
              <Scale size={20} className="text-[#A78BFA]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Legal Pages</h2>
              <p className="text-xs text-[#7A8199]">URLs linked in the footer</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Terms of Service URL</label>
              <input
                type="text" value={form.terms_url}
                onChange={(e) => setForm({ ...form, terms_url: e.target.value })}
                placeholder="/terms"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Privacy Policy URL</label>
              <input
                type="text" value={form.privacy_url}
                onChange={(e) => setForm({ ...form, privacy_url: e.target.value })}
                placeholder="/privacy"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#B7BDD0] mb-2">Refund Policy URL</label>
              <input
                type="text" value={form.refund_url}
                onChange={(e) => setForm({ ...form, refund_url: e.target.value })}
                placeholder="/refund"
                className="w-full rounded-lg border border-white/10 bg-[#0B0F1D] px-4 py-2.5 text-white placeholder:text-[#7A8199] focus:border-[#7559E8] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* SYSTEM */}
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#F05D70]/10 flex items-center justify-center">
              <Bell size={20} className="text-[#F05D70]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">System</h2>
              <p className="text-xs text-[#7A8199]">Advanced options</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B0F1D] p-4 cursor-pointer">
              <input
                type="checkbox" checked={form.email_notifications_enabled}
                onChange={(e) => setForm({ ...form, email_notifications_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#22C58B]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Email Notifications</p>
                <p className="text-xs text-[#7A8199]">Send emails for orders, enrollments, and announcements</p>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-[#F05D70]/30 bg-[#F05D70]/5 p-4 cursor-pointer">
              <input
                type="checkbox" checked={form.maintenance_mode}
                onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                className="w-5 h-5 rounded border-white/10 bg-white/5 text-[#F05D70]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#F05D70]">Maintenance Mode</p>
                <p className="text-xs text-[#F05D70]/70">Show a maintenance page instead of the site</p>
              </div>
            </label>
          </div>
        </section>
      </div>

      {/* Save Button at bottom (duplicate) */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7559E8] to-[#8B70FF] px-8 py-3 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
