import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tr } from "@/components/i18n/Tr";

const PHONES = [
  { src: "/images/mobile/mobile-1.png", alt: "Mobile app screen 1" },
  { src: "/images/mobile/mobile-2.png", alt: "Mobile app screen 2" },
  { src: "/images/mobile/mobile-3.png", alt: "Mobile app screen 3" },
];

export function MobileSection() {
  return (
    <section className="relative bg-bg-deep py-12 sm:py-14 lg:py-20 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-[#5B9EFF] mb-3 sm:mb-4">
            <Tr k="mobile.eyebrow" />
          </p>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-text-primary mb-3 leading-tight">
            <Tr k="mobile.title" />
          </h2>
          <p className="text-base sm:text-base lg:text-lg text-text-secondary">
            <Tr k="mobile.subtitle" />
          </p>
        </div>

        <div className="flex justify-center items-end gap-2 sm:gap-6">
          {PHONES.map((phone, i) => (
            <div
              key={i}
              className={"relative rounded-[1.5rem] sm:rounded-[2rem] border-4 sm:border-[6px] border-bg-elevated bg-bg-deep shadow-2xl overflow-hidden transition-all duration-300 " + (
                i === 1
                  ? "w-[36%] max-w-[260px] sm:scale-110 z-10"
                  : "w-[30%] max-w-[220px] opacity-90"
              )}
            >
              <div className="relative w-full aspect-[9/19]">
                <Image src={phone.src} alt={phone.alt} fill sizes="(max-width: 640px) 36vw, 260px" className="object-cover" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 sm:mt-14">
          <Link
            href="/marketplace"
            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-md bg-[#5B9EFF] px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-[#7BB5FF]"
          >
            <Tr k="mobile.cta" /> <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
