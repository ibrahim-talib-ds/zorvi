"use client";
import Link from "next/link";
export default function LicensePage() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">&larr; Back to Home</Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">License Terms</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <p>Last updated: November 2026</p>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Standard License</h2>
            <p>When you purchase a software project from the IBRANT Marketplace, you are granted a non-exclusive, non-transferable license to use the source code for personal or commercial purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Permitted Use</h2>
            <p>You may modify the code, integrate it into your own applications, and deploy it for your own business or clients.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Restrictions</h2>
            <p>You may not resell, redistribute, or sublicense the unmodified source code as a competing marketplace product. You may not claim the original code as your own intellectual property.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
