import "./globals.css";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["700", "800"], display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ZORVI — Learn. Create. Launch.",
  description: "A premium full-stack academy and marketplace. Learn to build real software, or buy production-ready projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
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
