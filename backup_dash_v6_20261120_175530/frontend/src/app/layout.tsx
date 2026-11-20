import { AutoTranslate } from "@/components/i18n/AutoTranslate";
import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/Providers";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "IBRANT \u2014 Learn. Create. Launch.",
  description:
    "A premium full-stack academy and marketplace. Learn to build real software, or buy production-ready projects.",
};

// No-flash theme blocker: runs before paint, sets .light/.dark on <html>.
// Route-scoped: the stored theme applies on the home page ("/") ONLY;
// every other route is forced dark so inner pages never flash light.
const THEME_BLOCKER = `(function(){try{var t=localStorage.getItem('zorvi-theme');if(t!=='light'&&t!=='dark'&&t!=='system')t='dark';var home=window.location.pathname==='/';var r=home?(t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t):'dark';var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(r);d.style.colorScheme=r;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen flex flex-col bg-bg-deep text-text-primary"
      >
        {/* No-flash theme blocker: runs before body paint. Route-scoped —
            applies the stored theme on "/" only; all other routes stay dark. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BLOCKER }} />
        <ThemeProvider>
          <I18nProvider>
            <AutoTranslate />
            <Providers>
              <Header />
              <main className="flex-1 pt-16 md:pt-[76px]">{children}</main>
              <Footer />
            </Providers>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
