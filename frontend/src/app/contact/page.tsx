"use client";
import Link from "next/link";

export default function Contact_Page() {
  return (
    <div className="min-h-screen bg-[#0B0F1D] text-[#B7BDD0] py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-[#8B70FF] hover:text-[#A78BFA] mb-8 inline-block font-medium">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-display font-extrabold text-white mb-8">Contact Us</h1>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Get in Touch</h2>
            <p className="mb-6">Have a question about a course or a marketplace project? Send us a message.</p>
            <form className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm text-[#B7BDD0] mb-1">Name</label>
                <input type="text" className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7559E8] outline-none" placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-sm text-[#B7BDD0] mb-1">Email</label>
                <input type="email" className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7559E8] outline-none" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-[#B7BDD0] mb-1">Message</label>
                <textarea rows={4} className="w-full bg-[#0B0F1D] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#7559E8] outline-none" placeholder="How can we help?"></textarea>
              </div>
              <button type="button" className="px-6 py-2.5 rounded-lg bg-[#7559E8] text-white font-medium hover:bg-[#8B70FF] transition">Send Message</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
