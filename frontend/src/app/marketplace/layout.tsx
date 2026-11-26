import { MarketplaceShell } from "./MarketplaceShell";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0B0F1D]"><MarketplaceShell>{children}</MarketplaceShell></div>;
}
