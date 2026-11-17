"use client";
import Link from "next/link";

export default function Technologies_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Technologies</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">The IBRANT Stack</h2>
            <p>We teach and build using modern, industry-standard technologies.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-xl font-bold text-white mb-2">Next.js 15 & React 19</h3>
                <p>For lightning-fast, SEO-friendly, and highly interactive frontend applications.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-xl font-bold text-white mb-2">FastAPI & Python 3.12</h3>
                <p>For high-performance, asynchronous backend APIs with automatic documentation.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-xl font-bold text-white mb-2">PostgreSQL 18</h3>
                <p>The world's most advanced open-source relational database.</p>
              </div>
              <div className="p-6 rounded-xl border border-white/10 bg-[#171B33]">
                <h3 className="text-xl font-bold text-white mb-2">Flutter</h3>
                <p>For building beautiful, native mobile apps for iOS and Android from a single codebase.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
