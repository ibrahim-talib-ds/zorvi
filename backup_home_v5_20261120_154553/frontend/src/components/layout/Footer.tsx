"use client";

import { Tr } from "@/components/i18n/Tr";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";

export function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-bg-deep pt-12 sm:pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-12">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <img src="/images/logo/ibrant-mark.png" alt="IBRANT" className="h-8 w-auto object-contain" />
              <span className="font-display text-xl font-extrabold tracking-tight text-[#8B70FF]">IBRANT</span>
            </Link>
            <p className="text-sm text-text-muted mb-6 max-w-xs">
              <Tr k="footer.learn_create_launch" /> <br />
              <Tr k="footer.turn_ideas" />
            </p>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 className="text-sm font-bold text-text-primary tracking-wider uppercase mb-4"><Tr k="footer.platform" /></h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li><Link href="/courses" className="hover:text-[#8B70FF] transition"><Tr k="footer.academy" /></Link></li>
              <li><Link href="/marketplace" className="hover:text-[#8B70FF] transition"><Tr k="footer.marketplace" /></Link></li>
              <li><Link href="/technologies" className="hover:text-[#8B70FF] transition"><Tr k="footer.technologies" /></Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#8B70FF] transition"><Tr k="footer.how_it_works" /></Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className="text-sm font-bold text-text-primary tracking-wider uppercase mb-4"><Tr k="footer.resources" /></h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li><Link href="/documentation" className="hover:text-[#8B70FF] transition"><Tr k="footer.documentation" /></Link></li>
              <li><Link href="/guides" className="hover:text-[#8B70FF] transition"><Tr k="footer.guides" /></Link></li>
              <li><Link href="/help" className="hover:text-[#8B70FF] transition"><Tr k="footer.help_center" /></Link></li>
              <li><Link href="/contact" className="hover:text-[#8B70FF] transition"><Tr k="footer.contact" /></Link></li>
            </ul>
          </div>

          {/* Column 4: Account & Legal */}
          <div>
            <h4 className="text-sm font-bold text-text-primary tracking-wider uppercase mb-4"><Tr k="footer.account" /></h4>
            <ul className="space-y-3 text-sm text-text-secondary mb-6">
              {!isAuthenticated ? (
                <>
                  <li><Link href="/login" className="hover:text-[#8B70FF] transition"><Tr k="nav.login" /></Link></li>
                  <li><Link href="/register" className="hover:text-[#8B70FF] transition"><Tr k="nav.create_account" /></Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/account" className="hover:text-[#8B70FF] transition"><Tr k="nav.my_dashboard" /></Link></li>
                  <li><Link href="/account/courses" className="hover:text-[#8B70FF] transition"><Tr k="footer.my_learning" /></Link></li>
                  <li><Link href="/account/orders" className="hover:text-[#8B70FF] transition"><Tr k="footer.my_purchases" /></Link></li>
                </>
              )}
            </ul>

            <h4 className="text-sm font-bold text-text-primary tracking-wider uppercase mb-4 mt-6"><Tr k="footer.legal" /></h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li><Link href="/terms" className="hover:text-[#8B70FF] transition"><Tr k="footer.terms" /></Link></li>
              <li><Link href="/privacy" className="hover:text-[#8B70FF] transition"><Tr k="footer.privacy" /></Link></li>
              <li><Link href="/license" className="hover:text-[#8B70FF] transition"><Tr k="footer.license" /></Link></li>
              <li><Link href="/refund" className="hover:text-[#8B70FF] transition"><Tr k="footer.refund" /></Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted text-center md:text-left">
            &copy; {currentYear} IBRANT. <Tr k="footer.rights" />
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
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
