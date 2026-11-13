"use client";

import { useState } from "react";
import { Info, Terminal, Shield, Star } from "lucide-react";
import { CodeBlock } from "@/components/courses/CodeBlock";

interface Props {
  longDescription: string;
  instructions: string | null;
  license: string | null;
  reviewCount: number;
}

export function ProductTabs({ longDescription, instructions, license, reviewCount }: Props) {
  const [tab, setTab] = useState<"details" | "instructions" | "license" | "reviews">("details");

  const tabs = [
    { id: "details" as const, label: "Details", icon: Info },
    { id: "instructions" as const, label: "Installation", icon: Terminal },
    { id: "license" as const, label: "License", icon: Shield },
    { id: "reviews" as const, label: `Reviews (${reviewCount})`, icon: Star },
  ];

  return (
    <div className="mt-8">
      {/* Tab Buttons */}
      <div className="flex items-center gap-6 border-b border-white/5 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              tab === t.id
                ? "text-white border-[#7559E8]"
                : "text-[#7A8199] border-transparent hover:text-white"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {tab === "details" && (
          <div className="prose prose-invert max-w-none">
            <h2 className="font-display text-2xl font-bold text-white mb-4">About this project</h2>
            <div className="text-[#B7BDD0] leading-relaxed whitespace-pre-line text-lg">
              {longDescription}
            </div>
          </div>
        )}

        {tab === "instructions" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">Installation Guide</h2>
            {instructions ? (
              <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-6">
                <pre className="text-[#B7BDD0] leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {instructions}
                </pre>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <Terminal size={32} className="text-[#7A8199] mx-auto mb-3" />
                <p className="text-[#7A8199]">No specific instructions provided. Please refer to the project documentation.</p>
              </div>
            )}
          </div>
        )}

        {tab === "license" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">License & Terms</h2>
            {license ? (
              <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-6">
                <div className="text-[#B7BDD0] leading-relaxed whitespace-pre-line">
                  {license}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
                <Shield size={32} className="text-[#7A8199] mx-auto mb-3" />
                <p className="text-[#7A8199]">No license terms provided yet.</p>
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-4">Reviews</h2>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <Star size={32} className="text-[#F5A623] mx-auto mb-3" />
              <p className="text-[#7A8199]">No reviews yet. Be the first to review this project!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
