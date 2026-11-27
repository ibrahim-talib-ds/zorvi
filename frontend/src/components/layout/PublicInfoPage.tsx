import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

interface PublicInfoPageProps {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  children: React.ReactNode;
}

export function PublicInfoPage({ eyebrow, title, description, updatedAt, children }: PublicInfoPageProps) {
  return (
    <div className="relative isolate min-h-[70vh] overflow-hidden bg-bg-deep text-text-primary">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] bg-[radial-gradient(ellipse_at_top,rgba(117,89,232,0.16),transparent_68%)]" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-surface/70 px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:border-[#7559E8]/50 hover:text-text-primary">
          <ArrowLeft size={15} /> Back to ibrant
        </Link>
        <header className="mt-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A78BFA]">{eyebrow}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-text-primary sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">{description}</p>
          {updatedAt ? <p className="mt-4 text-xs font-medium text-text-muted">Last updated: {updatedAt}</p> : null}
        </header>
        <div className="mt-10 rounded-3xl border border-bg-border bg-bg-surface/75 p-5 shadow-2xl shadow-black/10 sm:p-8 lg:p-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-text-primary [&_p]:text-sm [&_p]:leading-7 [&_p]:text-text-secondary [&_a]:text-[#A78BFA] [&_a]:underline-offset-4 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-text-secondary">
          {children}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-bg-border pt-6 text-sm text-text-muted">
          <span>Need more help? Contact the ibrant team.</span>
          <Link href="/contact" className="inline-flex items-center gap-1.5 font-semibold text-text-primary transition hover:text-[#A78BFA]">Contact support <ArrowUpRight size={15} /></Link>
        </div>
      </div>
    </div>
  );
}
