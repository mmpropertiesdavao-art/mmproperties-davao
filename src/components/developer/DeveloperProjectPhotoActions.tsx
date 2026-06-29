"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDeveloperProjectModal } from "@/components/developer/DeveloperProjectModalProvider";

type ProjectGalleryCarouselProps = {
  slug: string;
  projectName: string;
  images: string[];
};

export function DeveloperProjectGalleryCarousel({ slug, projectName, images }: ProjectGalleryCarouselProps) {
  const modal = useDeveloperProjectModal();
  const safeImages = images.length ? images : ["/placeholder-property.png"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeImages.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [safeImages.length]);

  function previous() {
    setIndex((current) => (current - 1 + safeImages.length) % safeImages.length);
  }

  function next() {
    setIndex((current) => (current + 1) % safeImages.length);
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-navy-900 shadow-2xl shadow-navy-950/35">
      <button type="button" onClick={() => modal?.openProject(slug)} className="block w-full" aria-label={`Open ${projectName} details`}>
        <img src={safeImages[index]} alt={`${projectName} gallery photo ${index + 1}`} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gold-200">Tap photo to view details</p>
        <p className="text-sm font-semibold text-white">{index + 1} / {safeImages.length}</p>
      </div>
      {safeImages.length > 1 && (
        <>
          <button type="button" onClick={previous} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg" aria-label="Previous project photo">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg" aria-label="Next project photo">
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}

export function DeveloperProjectPhotoButton({ slug, modelId, label, children }: { slug: string; modelId?: string | null; label: string; children: React.ReactNode }) {
  const modal = useDeveloperProjectModal();
  return (
    <button type="button" onClick={() => modal?.openProject(slug, { modelId })} className="block w-full text-left" aria-label={label}>
      {children}
    </button>
  );
}
