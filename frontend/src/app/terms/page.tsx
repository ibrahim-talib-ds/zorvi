"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Terms of Service</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>Last updated: November 2026</p>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing IBRANT, you agree to these Terms of Service. If you do not agree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. Using the platform for illegal or unauthorized purposes is strictly prohibited.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Marketplace & Academy</h2>
            <p><strong>Academy:</strong> Course content is for personal learning only. You may not redistribute, resell, or copy course materials. Certificates are issued upon completion.</p>
            <p><strong>Marketplace:</strong> Purchasing a product grants you a license to use the software for your own projects. You may not resell or redistribute the source code as a competing product. All sales are final unless otherwise stated.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Intellectual Property</h2>
            <p>All platform design, logos, and original content are the property of IBRANT. Third-party libraries used in marketplace products are subject to their respective open-source licenses.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Limitation of Liability</h2>
            <p>IBRANT provides software and educational content "as is". We are not liable for any damages arising from the use of our products, including but not limited to data loss, server errors, or financial loss.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
