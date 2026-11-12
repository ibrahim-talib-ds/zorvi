import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ZORVI — Learn. Create. Launch.",
  description: "A premium full-stack academy and marketplace. Learn to build real software, or buy production-ready projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-[#0B0F1D]">
        <Providers>
          <Header />
          <main className="flex-1 pt-16 md:pt-[76px]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
