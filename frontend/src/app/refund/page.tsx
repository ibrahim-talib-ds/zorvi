"use client";
import Link from "next/link";
export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">&larr; Back to Home</Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Refund Policy</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>Last updated: November 2026</p>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Digital Products</h2>
            <p>Because our products are digital software and downloadable files, all sales are generally considered final. Once you have downloaded the source code, we cannot revoke access.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Exceptions</h2>
            <p>If the product is completely non-functional and we are unable to fix the issue for you, a refund may be issued within 7 days of purchase.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How to Request</h2>
            <p>To request a refund, contact us at support@ibrant.com with your order ID and a detailed description of the issue.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
