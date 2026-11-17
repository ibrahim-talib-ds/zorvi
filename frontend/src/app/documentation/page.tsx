"use client";
import Link from "next/link";

export default function Documentation_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Documentation</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Developer Resources</h2>
            <p>Explore our technical documentation to get the most out of the IBRANT platform.</p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li><a href="https://ibrant-api.onrender.com/docs" target="_blank" rel="noreferrer" className="text-[#8B70FF] hover:underline">Backend API Reference (FastAPI Swagger)</a></li>
              <li><a href="#" className="text-[#8B70FF] hover:underline">Authentication & JWT Guide</a></li>
              <li><a href="#" className="text-[#8B70FF] hover:underline">Database Schema & Architecture</a></li>
              <li><a href="#" className="text-[#8B70FF] hover:underline">Deployment Guidelines (Render & Vercel)</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
