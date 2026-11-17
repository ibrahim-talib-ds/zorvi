"use client";
import Link from "next/link";

export default function Guides_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Learning Guides</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Free Tutorials & Guides</h2>
            <div className="space-y-4 mt-6">
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-lg font-bold text-white">Getting Started with FastAPI</h3>
                <p className="text-sm mt-2">Learn how to set up a Python backend in under 10 minutes.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-lg font-bold text-white">Mastering Next.js App Router</h3>
                <p className="text-sm mt-2">Understand server components, layouts, and data fetching.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-lg font-bold text-white">PostgreSQL for Beginners</h3>
                <p className="text-sm mt-2">Learn how to model relationships and write efficient SQL queries.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
