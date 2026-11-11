import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PHONES = [
  { src: "/images/mobile/mobile-1.png", alt: "Mobile app screen 1" },
  { src: "/images/mobile/mobile-2.png", alt: "Mobile app screen 2" },
  { src: "/images/mobile/mobile-3.png", alt: "Mobile app screen 3" },
];

export function MobileSection() {
  return (
    <section className="relative bg-[#0B0F1D] py-24 lg:py-32 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5B9EFF] mb-4">
            One Codebase. Multiple Platforms.
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
            Bring your ideas to people&apos;s hands.
          </h2>
          <p className="text-lg text-[#B7BDD0]">
            Build beautiful mobile applications for iOS and Android with Flutter. Learn to connect mobile interfaces to real APIs and databases.
          </p>
        </div>

        <div className="flex justify-center items-end gap-2 sm:gap-6">
          {PHONES.map((phone, i) => (
            <div
              key={i}
              className={`relative rounded-[2rem] border-[6px] border-[#1D2340] bg-[#0B0F1D] shadow-2xl overflow-hidden transition-all duration-300 ${
                i === 1
                  ? "w-[34%] max-w-[260px] scale-110 z-10"
                  : "w-[28%] max-w-[220px] opacity-90"
              }`}
            >
              <div className="relative w-full aspect-[9/19]">
                <Image src={phone.src} alt={phone.alt} fill className="object-cover" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-md bg-[#5B9EFF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7BB5FF]"
          >
            Explore Mobile Projects <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
