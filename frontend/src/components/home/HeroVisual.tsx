"use client";

import Image from "next/image";
import { motion } from "motion/react";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-[550px] mx-auto flex items-center justify-center">
      
      {/* Central Glow */}
      <div className="absolute inset-0 bg-[#7559E8]/20 blur-[80px] rounded-full" />

      {/* Main Dashboard Image (Center) */}
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-[90%] rounded-2xl border border-white/10 bg-[#0B0F1D] shadow-2xl overflow-hidden z-10"
      >
        <div className="h-7 bg-[#151A2D] flex items-center px-4 gap-2 border-b border-white/5">
          <div className="w-2 h-2 rounded-full bg-[#F05D70]" />
          <div className="w-2 h-2 rounded-full bg-[#F5A623]" />
          <div className="w-2 h-2 rounded-full bg-[#22C58B]" />
        </div>
        <div className="relative w-full aspect-[16/10] bg-[#171B33]">
          <Image 
            src="/images/hero/dashboard.png" 
            alt="ZORVI Dashboard" 
            fill 
            className="object-cover" 
            priority 
          />
        </div>
      </motion.div>

      {/* Mobile 1 (Bottom Left Overlap) */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-6 sm:-left-10 bottom-0 w-[100px] sm:w-[130px] rounded-[1.5rem] border-[4px] border-[#1D2340] bg-[#0B0F1D] shadow-2xl overflow-hidden z-20"
      >
        <div className="relative w-full aspect-[9/19]">
          <Image src="/images/mobile/mobile-1.png" alt="Mobile App 1" fill className="object-cover" />
        </div>
      </motion.div>

      {/* Mobile 2 (Top Right Overlap) */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute -right-6 sm:-right-10 top-4 w-[100px] sm:w-[130px] rounded-[1.5rem] border-[4px] border-[#1D2340] bg-[#0B0F1D] shadow-2xl overflow-hidden z-20"
      >
        <div className="relative w-full aspect-[9/19]">
          <Image src="/images/mobile/mobile-2.png" alt="Mobile App 2" fill className="object-cover" />
        </div>
      </motion.div>

    </div>
  );
}
