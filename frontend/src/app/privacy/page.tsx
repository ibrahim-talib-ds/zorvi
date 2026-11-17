"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Privacy Policy</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>Last updated: November 2026</p>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p>When you register for IBRANT, we collect your email address, full name, and (optionally) a profile picture. If you use third-party logins (Google/GitHub), we receive your basic profile information from those providers.</p>
            <p>We also track your course progress, certificates earned, and marketplace purchase history to provide our services.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <p>Your data is used to authenticate your account, process transactions, deliver purchased software/products, track your learning progress, and issue certificates. We do not sell your personal data to third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Data Storage & Security</h2>
            <p>Your data is securely stored using industry-standard providers (Neon PostgreSQL for database, Supabase for image storage). Passwords are cryptographically hashed using Argon2id. We implement strict access controls on our backend servers.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Services</h2>
            <p>We use Google and GitHub OAuth for authentication, Vercel for frontend hosting, and Render for backend hosting. These providers have their own privacy policies regarding data processing.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Your Rights</h2>
            <p>You have the right to request a copy of your personal data, update your profile information, or request account deletion. To exercise these rights, contact us at support@ibrant.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
