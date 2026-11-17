"use client";
import Link from "next/link";

export default function Help_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Help Center</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">How do I access a course after purchasing?</h3>
                <p>Once enrolled, navigate to your Account Dashboard and click "My Courses". You will have lifetime access.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Are the marketplace projects fully functional?</h3>
                <p>Yes. Every project in the marketplace is a complete, production-ready codebase with instructions for deployment.</p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">What payment methods do you accept?</h3>
                <p>We accept major credit cards, Stripe, and bank transfers for premium packages.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
