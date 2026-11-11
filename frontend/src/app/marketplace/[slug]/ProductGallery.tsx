"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

interface Props {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: Props) {
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#171B33] to-[#0B0F1D] aspect-video flex items-center justify-center">
        <span className="text-[12rem] font-extrabold text-[#7559E8]/20">{title.charAt(0)}</span>
      </div>
    );
  }

  const next = () => setSelected((selected + 1) % images.length);
  const prev = () => setSelected((selected - 1 + images.length) % images.length);

  return (
    <>
      {/* Main Viewer — IMAGE FILLS CONTAINER */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0B0F1D] overflow-hidden mb-4">
        <div className="relative aspect-video w-full flex items-center justify-center bg-[#0B0F1D]">
          <img
            src={images[selected]}
            alt={`${title} screenshot ${selected + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Fullscreen button */}
          <button
            onClick={() => setFullscreen(true)}
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/70 text-white hover:bg-black/90 transition z-10"
            title="View full size"
          >
            <Maximize2 size={16} />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition z-10"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition z-10"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Image counter */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-black/70 text-white text-xs font-mono z-10">
            {selected + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                selected === idx
                  ? "border-[#7559E8] opacity-100"
                  : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal — FILLS SCREEN */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-20"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-20"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-20"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <img
            src={images[selected]}
            alt={`${title} fullsize ${selected + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-black/70 text-white text-sm font-mono z-20">
            {selected + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
