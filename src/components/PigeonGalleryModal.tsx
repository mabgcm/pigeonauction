"use client";

import { useEffect } from "react";
import Image from "next/image";

const fallbackImages = ["/images/pigeon.jpg", "/images/pigeon.jpg", "/images/pigeon.jpg"];

export default function PigeonGalleryModal({
  isOpen,
  onClose,
  images = fallbackImages,
  activeIndex,
  onChange
}: {
  isOpen: boolean;
  onClose: () => void;
  images?: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((activeIndex + 1) % images.length);
      if (event.key === "ArrowLeft") onChange((activeIndex - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, activeIndex, images.length, onClose, onChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-neutral-800"
      >
        Close
      </button>
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-black">
        <div className="relative h-[60vh] w-full">
          <Image
            src={images[activeIndex]}
            alt="Pigeon"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <div className="flex items-center justify-between gap-4 bg-black/80 p-4 text-white">
          <button
            onClick={() => onChange((activeIndex - 1 + images.length) % images.length)}
            className="rounded-full border border-white/40 px-3 py-1 text-sm"
          >
            Prev
          </button>
          <div className="text-xs uppercase tracking-[0.3em]">{activeIndex + 1} / {images.length}</div>
          <button
            onClick={() => onChange((activeIndex + 1) % images.length)}
            className="rounded-full border border-white/40 px-3 py-1 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
