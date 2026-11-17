"use client";
import Link from "next/link";

export default function Howitworks_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">How It Works</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Learn. Create. Launch.</h2>
            <div className="space-y-6 mt-8">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#7559E8] flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Learn</h3>
                  <p>Enroll in our Academy. Watch video lessons, read comprehensive guides, and write code directly in our interactive Python runner.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#7559E8] flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Create</h3>
                  <p>Build real-world projects. Master the exact architecture used in production apps.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#7559E8] flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Launch</h3>
                  <p>Use the Marketplace. Buy production-ready source code or launch the apps you built during the courses.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
