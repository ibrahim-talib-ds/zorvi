import { AutoTranslate } from "@/components/i18n/AutoTranslate";
import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ClientShellWrapper } from "@/components/layout/ClientShellWrapper";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://ibrant.vercel.app"),
  title: {
    default: "ibrant — Learn. Create. Launch.",
    template: "%s | ibrant",
  },
  description:
    "Learn practical software development, build real projects, and explore digital products in the ibrant academy and marketplace.",
  applicationName: "ibrant",
  icons: {
    icon: [{ url: "/images/logo/ibrant-mark.svg", type: "image/svg+xml" }],
    shortcut: ["/images/logo/ibrant-mark.svg"],
  },
  openGraph: {
    type: "website",
    siteName: "ibrant",
    title: "ibrant — Learn. Create. Launch.",
    description:
      "A practical software academy and digital marketplace for people who build.",
    url: "https://ibrant.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "ibrant — Learn. Create. Launch.",
    description:
      "Learn practical software development, build real projects, and explore digital products.",
  },
  robots: { index: true, follow: true },
};

// Apply the saved theme before first paint to avoid a light/dark flash.
const THEME_BLOCKER = `(function(){try{var t=localStorage.getItem('zorvi-theme');if(t!=='light'&&t!=='dark'&&t!=='system')t='dark';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(r);d.style.colorScheme=r;}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-bg-deep text-text-primary"
      >
        {/* Set the saved theme before the first visible frame. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BLOCKER }} />
        <ThemeProvider>
          <I18nProvider>
            <AutoTranslate />
            <Providers>
              <ClientShellWrapper>{children}</ClientShellWrapper>
            </Providers>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
