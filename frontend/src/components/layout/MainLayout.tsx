import { Header } from "./Header";
import { Footer } from "./Footer";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-deep text-text-primary">
      <Header />
      {/* pt matches fixed header height */}
      <main className="flex-1 pt-16 md:pt-[72px]">{children}</main>
      <Footer />
    </div>
  );
}
