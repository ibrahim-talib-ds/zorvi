import { AutoTranslate } from "@/components/i18n/AutoTranslate";
import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/Providers";
import en from "@/i18n/en.json";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { GoogleTranslate } from "@/components/layout/GoogleTranslate";

export const metadata: Metadata = {
  title: "IBRANT — Learn. Create. Launch.",
  description: "A premium full-stack academy and marketplace. Learn to build real software, or buy production-ready projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
      suppressHydrationWarning className="antialiased min-h-screen flex flex-col bg-[#0B0F1D]">
        <I18nProvider messages={en}>
          <AutoTranslate />
        <Providers>
          <Header />
          <main className="flex-1 pt-16 md:pt-[76px]"><GoogleTranslate />
        {children}</main>
          <Footer />
        </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
