"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bath, BedDouble, Building2, Car, ChevronLeft, ChevronRight, MapPin, Ruler, Square, X } from "lucide-react";
import { PaymentCalculator } from "@/components/property/PaymentCalculator";

type Model = {
  id: string;
  name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floorArea: number | null;
  lotArea: number | null;
  parkingSlots: number | null;
  currentPrice: number | null;
  previousPrice: number | null;
  priceDifference: number | null;
  percentageChange: number | null;
  description: string | null;
  floorPlanImage: string | null;
  gallery: string[];
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
};

type ProjectPayload = {
  project: {
    id: string;
    slug: string;
    projectName: string;
    address: string | null;
    barangay: string | null;
    city: string;
    province: string;
    description: string | null;
    status: string;
    amenities: string[];
    heroImage: string | null;
    gallery: string[];
    developerName: string;
    developerLogo: string | null;
    developerWebsite: string | null;
    developerContactNumber: string | null;
    developerEmail: string | null;
  };
  models: Model[];
};

type DeveloperProjectModalContextValue = {
  openProject: (slug: string) => void;
};

const DeveloperProjectModalContext = createContext<DeveloperProjectModalContextValue | null>(null);

export function useDeveloperProjectModal() {
  return useContext(DeveloperProjectModalContext);
}

function formatPeso(value: number | null | undefined) {
  if (!value) return "Price on request";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

export function DeveloperProjectModalProvider({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [payload, setPayload] = useState<ProjectPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setSlug(null);
    setPayload(null);
    setError(null);
    setLoading(false);
  }, []);

  const openProject = useCallback((nextSlug: string) => {
    setSlug(nextSlug);
    setPayload(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/developer-projects/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Could not load this project.");
        return data as ProjectPayload;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this project.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, slug]);

  const value = useMemo(() => ({ openProject }), [openProject]);

  return (
    <DeveloperProjectModalContext.Provider value={value}>
      {children}
      {slug && (
        <div className="fixed inset-0 z-[9000] bg-navy-950/70 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-label="Developer project details" className="fixed inset-0 mx-auto flex h-[100dvh] max-w-6xl animate-[modalSlideUp_.22s_ease-out] flex-col overflow-hidden bg-white shadow-2xl md:inset-x-4 md:inset-y-4 md:h-auto md:rounded-3xl xl:inset-x-6">
            <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
              <p className="text-sm font-semibold text-navy-500">New development details</p>
              <button type="button" onClick={close} className="rounded-full border border-navy-200 p-2 text-navy-700 hover:border-gold-400 hover:bg-gold-50" aria-label="Close developer project details"><X size={20} /></button>
            </div>
            {loading && <div className="flex flex-1 items-center justify-center"><p className="rounded-full bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-600">Loading project…</p></div>}
            {error && !loading && <div className="flex flex-1 items-center justify-center p-6 text-center"><p className="font-semibold text-red-700">{error}</p></div>}
            {payload && !loading && !error && <DeveloperProjectModalContent payload={payload} />}
          </div>
        </div>
      )}
    </DeveloperProjectModalContext.Provider>
  );
}

function DeveloperProjectModalContent({ payload }: { payload: ProjectPayload }) {
  const { project, models } = payload;
  const [selectedModelId, setSelectedModelId] = useState<string | null>(models[0]?.id ?? null);
  const selectedModel = models.find((model) => model.id === selectedModelId) || models[0] || null;
  const projectImages = [project.heroImage, ...(project.gallery || [])].filter(Boolean) as string[];
  const modelImages = selectedModel ? [...(selectedModel.gallery || []), selectedModel.floorPlanImage].filter(Boolean) as string[] : [];
  const gallery = (modelImages.length ? modelImages : projectImages).length ? (modelImages.length ? modelImages : projectImages) : ["/placeholder-property.png"];
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const startingPrice = models.reduce<number | null>((lowest, model) => {
    if (!model.currentPrice) return lowest;
    return lowest === null ? model.currentPrice : Math.min(lowest, model.currentPrice);
  }, null);

  function previous() {
    setActiveIndex((current) => (current - 1 + gallery.length) % gallery.length);
  }
  function next() {
    setActiveIndex((current) => (current + 1) % gallery.length);
  }

  function chooseModel(model: Model) {
    setSelectedModelId(model.id);
    setActiveIndex(0);
  }

  return (
    <div className="grid min-h-0 flex-1 overflow-y-auto xl:grid-cols-[minmax(0,1.08fr)_420px] xl:overflow-hidden">
      <section className="min-w-0 bg-slate-950 p-3 text-white md:p-5 xl:flex xl:h-full xl:flex-col xl:overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black md:aspect-[16/10] xl:aspect-auto xl:flex-1" onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStartX.current === null) return; const delta = event.changedTouches[0].clientX - touchStartX.current; if (Math.abs(delta) > 45) delta > 0 ? previous() : next(); touchStartX.current = null; }}>
          <img src={gallery[activeIndex]} alt={`${project.projectName} photo ${activeIndex + 1}`} className="h-full w-full object-contain" loading="lazy" />
          {gallery.length > 1 && (
            <>
              <button type="button" onClick={previous} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg" aria-label="Previous project photo"><ChevronLeft size={24} /></button>
              <button type="button" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-lg" aria-label="Next project photo"><ChevronRight size={24} /></button>
            </>
          )}
          <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs font-semibold">{activeIndex + 1} / {gallery.length}</div>
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} className={`image-zoom-frame h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-white/10 ${index === activeIndex ? "border-gold-400" : "border-transparent"}`}><img src={image} alt="" className="zoomable-image h-full w-full object-cover" loading="lazy" /></button>)}
          </div>
        )}
        {(selectedModel?.currentPrice || startingPrice) ? (
          <PaymentCalculator
            price={selectedModel?.currentPrice || startingPrice || 0}
            className="mt-4 shrink-0 text-sm [&_*]:min-w-0 [&_h3]:mb-3 [&_h3]:text-base [&_label]:mb-2 [&_p]:break-words"
          />
        ) : null}
      </section>
      <aside className="min-w-0 bg-white p-5 pb-24 md:p-7 xl:h-full xl:overflow-y-auto xl:pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-violet-600 px-3 py-1 text-xs font-bold uppercase text-white">New Development</span>
          <span className="rounded-md bg-gold-100 px-3 py-1 text-xs font-bold uppercase text-navy-900">{formatStatus(project.status)}</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-navy-950">{project.projectName}</h1>
        <p className="mt-1 font-semibold text-navy-700">{project.developerName}</p>
        <p className="mt-2 flex gap-2 text-sm leading-6 text-navy-500"><MapPin size={17} className="mt-1 shrink-0 text-gold-600" />{[project.address, project.barangay, project.city, project.province].filter(Boolean).join(", ")}</p>
        <p className="mt-4 text-2xl font-bold text-navy-950">
          {selectedModel ? formatPeso(selectedModel.currentPrice) : `Starting from ${formatPeso(startingPrice)}`}
        </p>
        {selectedModel && (
          <p className="mt-1 text-sm font-semibold text-violet-700">
            Selected model: {selectedModel.name}
          </p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Info icon={<Building2 size={18} />} label="Models" value={`${models.length} available`} />
          <Info icon={<BedDouble size={18} />} label="Bedrooms" value={range(models.map((m) => m.bedrooms))} />
          <Info icon={<Bath size={18} />} label="Bathrooms" value={range(models.map((m) => m.bathrooms))} />
          <Info icon={<Square size={18} />} label="Inventory" value={`${selectedModel?.availableUnits ?? models.reduce((sum, model) => sum + model.availableUnits, 0)} available`} />
        </div>
        {(selectedModel?.description || project.description) && (
          <section className="mt-5">
            <h3 className="font-bold text-navy-900">{selectedModel ? "House description" : "Project description"}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-navy-600">{selectedModel?.description || project.description}</p>
          </section>
        )}
        {selectedModel && (
          <section className="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4">
            <h3 className="font-bold text-navy-900">Model details</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-navy-700">
              <span>{selectedModel.bedrooms ?? "—"} bedrooms</span>
              <span>{selectedModel.bathrooms ?? "—"} bathrooms</span>
              <span>{selectedModel.floorArea ?? "—"} sqm floor</span>
              <span>{selectedModel.lotArea ?? "—"} sqm lot</span>
              <span>{selectedModel.parkingSlots ?? "—"} parking</span>
              <span>{selectedModel.availableUnits} available</span>
              <span>{selectedModel.reservedUnits} reserved</span>
              <span>{selectedModel.soldUnits} sold</span>
            </div>
          </section>
        )}
        {project.amenities?.length > 0 && <div className="mt-5"><h3 className="font-bold text-navy-900">Amenities</h3><div className="mt-3 flex flex-wrap gap-2">{project.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-navy-800">{amenity}</span>)}</div></div>}
        <section className="mt-6">
          <h3 className="font-bold text-navy-900">House models</h3>
          <div className="mt-3 space-y-3">
            {models.map((model) => <ModelCard key={model.id} model={model} selected={model.id === selectedModel?.id} onSelect={() => chooseModel(model)} />)}
          </div>
        </section>
        <a href={`/projects/${project.slug}`} className="mt-6 inline-flex w-full justify-center rounded-xl border border-navy-200 px-5 py-3 font-bold text-navy-900 hover:border-gold-400">Open full project page</a>
      </aside>
    </div>
  );
}

function range(values: Array<number | null>) {
  const nums = values.filter((value): value is number => value !== null && value !== undefined);
  if (!nums.length) return "Not provided";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? String(min) : `${min} - ${max}`;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-navy-100 bg-navy-50 p-3"><div className="flex items-center gap-2 text-navy-500">{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-1 font-bold text-navy-900">{value}</p></div>;
}

function ModelCard({ model, selected, onSelect }: { model: Model; selected?: boolean; onSelect?: () => void }) {
  const image = model.gallery?.[0] || model.floorPlanImage || "/placeholder-property.png";
  return (
    <button type="button" onClick={onSelect} className={`block w-full overflow-hidden rounded-xl border bg-white text-left transition hover:border-gold-400 ${selected ? "border-gold-400 ring-2 ring-gold-100" : "border-navy-100"}`}>
      <div className="image-zoom-frame h-36 overflow-hidden bg-navy-50"><img src={image} alt={model.name} className="zoomable-image h-full w-full object-cover" loading="lazy" /></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-navy-950">{model.name}</h4>
            <p className="text-lg font-bold text-navy-900">{formatPeso(model.currentPrice)}</p>
          </div>
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-800">{model.availableUnits} available</span>
        </div>
        {model.priceDifference ? <p className={`mt-1 text-xs font-bold ${model.priceDifference > 0 ? "text-red-600" : "text-green-700"}`}>{model.priceDifference > 0 ? "+" : ""}{formatPeso(model.priceDifference)} ({model.percentageChange?.toFixed(2)}%)</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
          <span className="inline-flex items-center gap-1"><BedDouble size={14} />{model.bedrooms ?? "—"} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={14} />{model.bathrooms ?? "—"} ba</span>
          <span className="inline-flex items-center gap-1"><Ruler size={14} />{model.floorArea ?? "—"} sqm floor</span>
          <span className="inline-flex items-center gap-1"><Square size={14} />{model.lotArea ?? "—"} sqm lot</span>
          <span className="inline-flex items-center gap-1"><Car size={14} />{model.parkingSlots ?? "—"} parking</span>
        </div>
      </div>
    </button>
  );
}
