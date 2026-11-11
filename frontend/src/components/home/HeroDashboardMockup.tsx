"use client";

import { motion } from "motion/react";
import Image from "next/image";

export function HeroDashboardMockup() {
  return (
    <div className="relative w-full max-w-[1100px] mx-auto flex flex-col items-center pt-8 pb-24">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-[90%] md:w-[80%] rounded-xl border border-white/10 bg-[#0B0F1D] shadow-2xl overflow-hidden z-10">
        <div className="h-7 bg-[#151A2D] flex items-center px-4 gap-2 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-accent-rose" />
          <div className="w-3 h-3 rounded-full bg-accent-amber" />
          <div className="w-3 h-3 rounded-full bg-accent-teal" />
        </div>
        <div className="relative w-full aspect-[16/9]">
          <Image src="/images/hero/dashboard.png" alt="Web Dashboard" fill className="object-cover" priority />
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-0 sm:left-4 w-[120px] sm:w-[180px] rounded-[1.5rem] border-[5px] border-[#1D2340] bg-[#0B0F1D] shadow-2xl overflow-hidden z-20 hidden sm:block"
      >
        <div className="relative w-full aspect-[9/19]">
          <Image src="/images/mobile/mobile-1.png" alt="Mobile 1" fill className="object-cover" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 right-0 sm:right-4 w-[120px] sm:w-[180px] rounded-[1.5rem] border-[5px] border-[#1D2340] bg-[#0B0F1D] shadow-2xl overflow-hidden z-20 hidden sm:block"
      >
        <div className="relative w-full aspect-[9/19]">
          <Image src="/images/mobile/mobile-2.png" alt="Mobile 2" fill className="object-cover" />
        </div>
      </motion.div>

      <div className="absolute -bottom-10 right-10 sm:right-32 w-[250px] md:w-[350px] rounded-xl border border-white/10 bg-[#0B0F1D] shadow-2xl overflow-hidden z-30 hidden md:block">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#151A2D]">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="text-[10px] font-mono text-text-muted">PostgreSQL - Database</span>
        </div>
        <div className="relative w-full aspect-[4/3]">
          <Image src="/images/database/db-schema.png" alt="DB Schema" fill className="object-cover opacity-90" />
        </div>
      </div>
    </div>
  );
}
