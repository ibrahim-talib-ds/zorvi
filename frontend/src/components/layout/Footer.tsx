import { Tr } from "@/components/i18n/Tr";
"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0B0F1D] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <img src="/images/logo/ibrant-mark.png" alt="IBRANT" className="h-8 w-auto object-contain" />
              <span className="font-display text-xl font-extrabold tracking-tight text-[#8B70FF]">IBRANT</span>
            </Link>
            <p className="text-sm text-[#7A8199] mb-6 max-w-xs">
              Learn. Create. Launch. <br />
              Turn your ideas into real software products.
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-4"><Tr k="footer.platform" /></h4>
            <ul className="space-y-3 text-sm text-[#B7BDD0]">
              <li><Link href="/courses" className="hover:text-[#8B70FF] transition">Academy</Link></li>
              <li><Link href="/marketplace" className="hover:text-[#8B70FF] transition">Project Marketplace</Link></li>
              <li><Link href="/technologies" className="hover:text-[#8B70FF] transition">Technologies</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#8B70FF] transition">How It Works</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-4"><Tr k="footer.resources" /></h4>
            <ul className="space-y-3 text-sm text-[#B7BDD0]">
              <li><Link href="/documentation" className="hover:text-[#8B70FF] transition">Documentation</Link></li>
              <li><Link href="/guides" className="hover:text-[#8B70FF] transition">Learning Guides</Link></li>
              <li><Link href="/help" className="hover:text-[#8B70FF] transition">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-[#8B70FF] transition">Contact</Link></li>
            </ul>
          </div>

          {/* Column 4: Account & Legal */}
          <div>
            <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-4"><Tr k="footer.account" /></h4>
            <ul className="space-y-3 text-sm text-[#B7BDD0] mb-6">
              {!isAuthenticated ? (
                <>
                  <li><Link href="/login" className="hover:text-[#8B70FF] transition">Log In</Link></li>
                  <li><Link href="/register" className="hover:text-[#8B70FF] transition">Create Account</Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/account" className="hover:text-[#8B70FF] transition">My Dashboard</Link></li>
                  <li><Link href="/account/courses" className="hover:text-[#8B70FF] transition">My Learning</Link></li>
                  <li><Link href="/account/orders" className="hover:text-[#8B70FF] transition">My Purchases</Link></li>
                </>
              )}
            </ul>
            
            <h4 className="text-sm font-bold text-white tracking-wider uppercase mb-4 mt-6"><Tr k="footer.legal" /></h4>
            <ul className="space-y-3 text-sm text-[#B7BDD0]">
              <li><Link href="/terms" className="hover:text-[#8B70FF] transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-[#8B70FF] transition">Privacy Policy</Link></li>
              <li><Link href="/license" className="hover:text-[#8B70FF] transition">License Terms</Link></li>
              <li><Link href="/refund" className="hover:text-[#8B70FF] transition">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#7A8199]">
            &copy; {currentYear} IBRANT. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-[#7A8199]">
            <span>PostgreSQL 18</span>
            <span className="text-white/20">&bull;</span>
            <span>FastAPI</span>
            <span className="text-white/20">&bull;</span>
            <span>Next.js 15</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
