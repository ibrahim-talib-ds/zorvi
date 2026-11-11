"use client";

import { useState } from "react";
import { PlayCircle, X, ExternalLink, ShieldAlert } from "lucide-react";

interface Props {
  demoUrl: string | null;
}

export function DemoButton({ demoUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition mb-3"
      >
        <PlayCircle size={18} className="text-[#A78BFA]" />
        Try Live Demo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#11152A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <PlayCircle size={20} className="text-[#A78BFA]" /> Live Demo
              </h3>
              <button onClick={() => setOpen(false)} className="text-[#7A8199] hover:text-white">
                <X size={20} />
              </button>
            </div>

            {demoUrl ? (
              <div className="space-y-4">
                <p className="text-sm text-[#B7BDD0]">
                  This is a real, working demo of the project. You can click around, test the features, and see how it works before you buy.
                </p>
                <div className="rounded-xl border border-white/10 bg-black/40 p-8 text-center">
                  <p className="text-[#7A8199] text-sm mb-4">
                    Demo is hosted at:<br />
                    <span className="font-mono text-[#A78BFA] break-all">{demoUrl}</span>
                  </p>
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#7559E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B70FF] transition"
                  >
                    Open Demo <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} className="text-[#F5A623]" />
                </div>
                <h4 className="text-white font-semibold">Demo not available yet</h4>
                <p className="text-sm text-[#B7BDD0]">
                  The creator hasn&apos;t added a live demo link for this project. You can still buy it and access the full source code immediately after payment.
                </p>
                <p className="text-xs text-[#7A8199] pt-4 border-t border-white/5">
                  Note: To prevent theft and reverse engineering, demos are read-only. The source code is only delivered after a successful purchase.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
