"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

interface GalleryImage { url: string; altText: string | null }

export function PropertyGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const displayImages = images.length > 0 ? images : [{ url: "/placeholder-property.png", altText: title }];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + displayImages.length) % displayImages.length);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % displayImages.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [activeIndex, displayImages.length]);

  function previous() { setActiveIndex((current) => current === null ? null : (current - 1 + displayImages.length) % displayImages.length); }
  function next() { setActiveIndex((current) => current === null ? null : (current + 1) % displayImages.length); }

  return (
    <>
      <div className="mb-6 grid aspect-[16/9] grid-cols-2 gap-2 overflow-hidden rounded-xl bg-gray-100">
        {displayImages.slice(0, 3).map((image, index) => (
          <button key={`${image.url}-${index}`} type="button" onClick={() => setActiveIndex(index)} className={`image-zoom-frame group relative overflow-hidden bg-navy-50 ${index === 0 ? "row-span-2" : ""}`} aria-label={`Open photo ${index + 1} of ${displayImages.length}`}>
            <img src={image.url} alt={image.altText || title} className="zoomable-image h-full w-full object-cover" onError={(event) => { event.currentTarget.src = "/placeholder-property.png"; }} />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            {index === 2 && displayImages.length > 3 && <span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-navy-900/90 px-3 py-2 text-sm font-medium text-white"><Images size={16} /> View all {displayImages.length}</span>}
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 sm:p-10" role="dialog" aria-modal="true" aria-label="Property photo gallery" onClick={() => setActiveIndex(null)}>
          <button type="button" onClick={() => setActiveIndex(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close gallery"><X size={28} /></button>
          <p className="absolute left-1/2 top-5 -translate-x-1/2 text-sm text-white/80">{activeIndex + 1} / {displayImages.length}</p>
          {displayImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); previous(); }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:left-8" aria-label="Previous photo"><ChevronLeft size={32} /></button>}
          <img src={displayImages[activeIndex].url} alt={displayImages[activeIndex].altText || `${title} photo ${activeIndex + 1}`} className="max-h-full max-w-full rounded-md object-contain" onClick={(event) => event.stopPropagation()} onError={(event) => { event.currentTarget.src = "/placeholder-property.png"; }} />
          {displayImages.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); next(); }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:right-8" aria-label="Next photo"><ChevronRight size={32} /></button>}
        </div>
      )}
    </>
  );
}
