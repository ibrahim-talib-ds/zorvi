"use client";

import { useState } from "react";

interface Props {
  longDescription: string;
  instructions: string | null;
  license: string | null;
  reviewCount: number;
}

export function ProductTabs({ longDescription, instructions, license, reviewCount }: Props) {
  const [tab, setTab] = useState<"details" | "reviews" | "instructions" | "license">("details");

  const tabs = [
    { id: "details" as const, label: "Details" },
    { id: "reviews" as const, label: `Reviews (${reviewCount})` },
    { id: "instructions" as const, label: "Instructions" },
    { id: "license" as const, label: "License" },
  ];

  return (
    <div>
      {/* Tab buttons */}
      <div className="border-b border-white/5 mb-6 mt-8">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-semibold transition ${
                tab === t.id
                  ? "text-white border-b-2 border-[#7559E8]"
                  : "text-[#7A8199] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "details" && (
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">About this project</h2>
          <div className="text-[#B7BDD0] leading-relaxed whitespace-pre-line">
            {longDescription}
          </div>
        </div>
      )}

      {tab === "reviews" && (
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">Reviews</h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
            <p className="text-[#7A8199] text-sm">No reviews yet. Be the first to review this project!</p>
            <p className="text-xs text-[#7A8199] mt-2">Reviews system coming soon.</p>
          </div>
        </div>
      )}

      {tab === "instructions" && (
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">Installation Instructions</h2>
          {instructions ? (
            <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-6">
              <pre className="text-[#B7BDD0] leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {instructions}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <p className="text-[#7A8199] text-sm">No instructions provided yet.</p>
            </div>
          )}
        </div>
      )}

      {tab === "license" && (
        <div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">License</h2>
          {license ? (
            <div className="rounded-xl border border-white/10 bg-[#0B0F1D] p-6">
              <div className="text-[#B7BDD0] leading-relaxed whitespace-pre-line">
                {license}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 text-center">
              <p className="text-[#7A8199] text-sm">No license terms provided yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
