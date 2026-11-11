import Link from "next/link";

const FOOTER_GROUPS = [
  {
    title: "Platform",
    links: [
      { href: "/courses", label: "Academy" },
      { href: "/marketplace", label: "Project Marketplace" },
      { href: "/#technologies", label: "Technologies" },
      { href: "/#how-it-works", label: "How It Works" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/guides", label: "Learning Guides" },
      { href: "/help", label: "Help Center" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log In" },
      { href: "/register", label: "Create Account" },
      { href: "/account/courses", label: "My Learning" },
      { href: "/account/orders", label: "My Purchases" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/license", label: "License Terms" },
      { href: "/refund", label: "Refund Policy" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0B0F1D]">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {/* Top: brand + link columns */}
        <div className="grid gap-8 md:gap-10">
          {/* Brand — full width on mobile, 2 cols on desktop */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img
                src="/images/logo/zorvi-mark.png"
                alt="ZORVI"
                className="w-10 h-10 transition-transform group-hover:scale-105"
              />
              <span className="font-display text-2xl font-extrabold text-white">
                ZORVI
              </span>
            </Link>
            <p className="mt-1 text-sm text-[#A78BFA]">Learn. Create. Launch.</p>
            <p className="mt-2 max-w-sm text-sm text-[#B7BDD0]">
              Turn your ideas into real software products.
            </p>
          </div>

          {/* Link groups — 2 columns on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 sm:gap-x-8">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="mb-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7A8199]">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-[#B7BDD0] hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-[#7A8199]">
          <p>© {year} ZORVI. All rights reserved.</p>
          <p className="font-mono">PostgreSQL 18 · FastAPI · Next.js 15</p>
        </div>
      </div>
    </footer>
  );
}
