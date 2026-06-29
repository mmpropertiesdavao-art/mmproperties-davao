"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bath, BedDouble, Building2, Car, ChevronLeft, ChevronRight, MapPin, Ruler, Square, X } from "lucide-react";
import { PaymentCalculator } from "@/components/property/PaymentCalculator";
import { VideoEmbed } from "@/components/video/VideoEmbed";

type Model = {
  id: string;
  modelType?: "house_model" | "lot_only";
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
  specifications?: Record<string, unknown> | null;
  floorPlanImage: string | null;
  videoUrl: string | null;
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
    videoUrl: string | null;
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
  openProject: (slug: string, options?: { inquiry?: boolean; modelId?: string | null }) => void;
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
  const [openInquiryAfterLoad, setOpenInquiryAfterLoad] = useState(false);
  const [initialModelId, setInitialModelId] = useState<string | null>(null);

  const close = useCallback(() => {
    setSlug(null);
    setPayload(null);
    setError(null);
    setLoading(false);
  }, []);

  const openProject = useCallback((nextSlug: string, options?: { inquiry?: boolean; modelId?: string | null }) => {
    setSlug(nextSlug);
    setPayload(null);
    setError(null);
    setOpenInquiryAfterLoad(Boolean(options?.inquiry));
    setInitialModelId(options?.modelId || null);
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
    function onOpen(event: Event) {
      const custom = event as CustomEvent<{ slug?: string; inquiry?: boolean; modelId?: string | null }>;
      if (custom.detail?.slug) openProject(custom.detail.slug, { inquiry: custom.detail.inquiry, modelId: custom.detail.modelId });
    }
    window.addEventListener("mm:open-developer-project", onOpen);
    return () => window.removeEventListener("mm:open-developer-project", onOpen);
  }, [openProject]);

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
            {payload && !loading && !error && <DeveloperProjectModalContent payload={payload} openInquiryAfterLoad={openInquiryAfterLoad} initialModelId={initialModelId} />}
          </div>
        </div>
      )}
    </DeveloperProjectModalContext.Provider>
  );
}

function DeveloperProjectModalContent({ payload, openInquiryAfterLoad, initialModelId }: { payload: ProjectPayload; openInquiryAfterLoad?: boolean; initialModelId?: string | null }) {
  const { project, models } = payload;
  const isLotOnlyProject = models.length > 0 && models.every((model) => model.modelType === "lot_only");
  const hasMixedInventory = models.some((model) => model.modelType === "lot_only") && models.some((model) => model.modelType !== "lot_only");
  const inventoryPrompt = models.length === 0 ? "Project details" : isLotOnlyProject ? "Choose a lot to view" : hasMixedInventory ? "Choose inventory to view" : "Choose a model to view";
  const [selectedModelId, setSelectedModelId] = useState<string | null>(initialModelId || (isLotOnlyProject ? models[0]?.id : null) || null);
  const [inquiryOpen, setInquiryOpen] = useState(Boolean(openInquiryAfterLoad));
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const selectedModel = models.find((model) => model.id === selectedModelId) || null;
  const projectImages = [project.heroImage, ...(project.gallery || [])].filter(Boolean) as string[];
  const modelImages = selectedModel ? [...(selectedModel.gallery || []), selectedModel.floorPlanImage].filter(Boolean) as string[] : [];
  const activeGallery = modelImages.length ? modelImages : projectImages;
  const gallery = (selectedModel?.modelType === "lot_only" ? activeGallery.slice(0, 2) : activeGallery).length ? (selectedModel?.modelType === "lot_only" ? activeGallery.slice(0, 2) : activeGallery) : ["/placeholder-property.png"];
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const startingPrice = models.reduce<number | null>((lowest, model) => {
    if (!model.currentPrice) return lowest;
    return lowest === null ? model.currentPrice : Math.min(lowest, model.currentPrice);
  }, null);
  const descriptionText = selectedModel?.description || project.description || "";
  const activeVideoUrl = selectedModel?.videoUrl || project.videoUrl;
  const hasLongDescription = descriptionText.length > 260;
  const displayedDescription = expanded || !hasLongDescription ? descriptionText : `${descriptionText.slice(0, 260).trim()}…`;

  function previous() {
    setActiveIndex((current) => (current - 1 + gallery.length) % gallery.length);
  }
  function next() {
    setActiveIndex((current) => (current + 1) % gallery.length);
  }

  function chooseModel(modelId: string) {
    setSelectedModelId(modelId || null);
    setActiveIndex(0);
    setExpanded(false);
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
        {selectedModel?.currentPrice ? (
          <PaymentCalculator
            price={selectedModel.currentPrice}
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
        <section className="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4">
          <label className="text-sm font-bold text-navy-900" htmlFor="developer-model-select">
            {inventoryPrompt}
          </label>
          {models.length > 0 ? (
            <select
              id="developer-model-select"
              value={selectedModelId || ""}
              onChange={(event) => chooseModel(event.target.value)}
              className="mt-2 w-full rounded-lg border border-navy-200 bg-white px-3 py-3 text-sm font-semibold text-navy-900"
            >
              {!isLotOnlyProject && <option value="">Select inventory</option>}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.modelType === "lot_only" ? "Lot only" : "House model"} - {formatPeso(model.currentPrice)}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-3 rounded-lg bg-white p-3 text-sm text-navy-600">
              No house model or lot inventory has been added yet. You can still review the project photos and send an inquiry.
            </p>
          )}
          {!selectedModel && models.length > 0 && (
            <p className="mt-3 text-sm text-navy-500">
              Select an item to view its photos, calculator, description, floor plan, availability, and inquiry form.
            </p>
          )}
        </section>

        {selectedModel && (
          <>
            <p className="mt-4 text-2xl font-bold text-navy-950">{formatPeso(selectedModel.currentPrice)}</p>
            <p className="mt-1 text-sm font-semibold text-violet-700">
              Selected {selectedModel.modelType === "lot_only" ? "lot" : "model"}: {selectedModel.name}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info icon={<Building2 size={18} />} label={selectedModel.modelType === "lot_only" ? "Lot type" : "Model"} value={selectedModel.name} />
              {selectedModel.modelType !== "lot_only" && <Info icon={<BedDouble size={18} />} label="Bedrooms" value={selectedModel.bedrooms == null ? "Not provided" : String(selectedModel.bedrooms)} />}
              {selectedModel.modelType !== "lot_only" && <Info icon={<Bath size={18} />} label="Bathrooms" value={selectedModel.bathrooms == null ? "Not provided" : String(selectedModel.bathrooms)} />}
              {selectedModel.modelType === "lot_only" && <Info icon={<Ruler size={18} />} label="Price / sqm" value={selectedModel.lotArea && selectedModel.currentPrice ? formatPeso(selectedModel.currentPrice / selectedModel.lotArea) : "Not provided"} />}
              <Info icon={<Square size={18} />} label="Inventory" value={`${selectedModel.availableUnits} available`} />
            </div>
          </>
        )}

        {activeVideoUrl && (
          <section className="mt-5">
            <h3 className="mb-3 font-bold text-navy-900">Video tour</h3>
            <VideoEmbed url={activeVideoUrl} title={`${selectedModel?.name || project.projectName} video tour`} />
          </section>
        )}

        {(selectedModel || models.length === 0) && descriptionText && (
          <section className="mt-5">
            <h3 className="font-bold text-navy-900">{selectedModel?.modelType === "lot_only" ? "Lot description" : selectedModel ? "House description" : "Project description"}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-navy-600">{displayedDescription}</p>
            {hasLongDescription && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 text-sm font-bold text-gold-700">{expanded ? "See Less" : "See More"}</button>}
          </section>
        )}
        {selectedModel && (
          <section className="mt-5 rounded-xl border border-navy-100 bg-navy-50 p-4">
            <h3 className="font-bold text-navy-900">Model details</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-navy-700">
              {selectedModel.modelType !== "lot_only" && <span>{selectedModel.bedrooms ?? "—"} bedrooms</span>}
              {selectedModel.modelType !== "lot_only" && <span>{selectedModel.bathrooms ?? "—"} bathrooms</span>}
              <span>{selectedModel.floorArea ?? "—"} sqm floor</span>
              <span>{selectedModel.lotArea ?? "—"} sqm lot</span>
              {selectedModel.modelType !== "lot_only" && <span>{selectedModel.parkingSlots ?? "—"} parking</span>}
              {selectedModel.modelType === "lot_only" && <span>{selectedModel.lotArea && selectedModel.currentPrice ? formatPeso(selectedModel.currentPrice / selectedModel.lotArea) : "—"} / sqm</span>}
              <span>{selectedModel.availableUnits} available</span>
              <span>{selectedModel.reservedUnits} reserved</span>
              <span>{selectedModel.soldUnits} sold</span>
            </div>
          </section>
        )}
        {selectedModel?.floorPlanImage && (
          <section className="mt-5 rounded-xl border border-gold-100 bg-gold-50 p-4">
            <h3 className="font-bold text-navy-900">Floor plan</h3>
            <p className="mt-1 text-sm text-navy-600">Floor plan image is included in the photo gallery.</p>
          </section>
        )}
        {selectedModel?.specifications && Object.keys(selectedModel.specifications).length > 0 && (
          <section className="mt-5 rounded-xl border border-navy-100 bg-white p-4">
            <h3 className="font-bold text-navy-900">Specifications</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selectedModel.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 border-b border-navy-50 pb-2">
                  <dt className="font-semibold capitalize text-navy-500">{key.replace(/[_-]/g, " ")}</dt>
                  <dd className="text-right text-navy-800">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {project.amenities?.length > 0 && <div className="mt-5"><h3 className="font-bold text-navy-900">Amenities</h3><div className="mt-3 flex flex-wrap gap-2">{project.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-navy-800">{amenity}</span>)}</div></div>}
        {(selectedModel || models.length === 0) && <button type="button" onClick={() => setInquiryOpen(true)} className="mt-6 w-full rounded-xl bg-gold-500 px-5 py-3 font-bold text-navy-950 shadow-lg hover:bg-gold-400">
          Inquire about {selectedModel?.name || project.projectName}
        </button>}
        <a href={`/projects/${project.slug}`} className="mt-6 inline-flex w-full justify-center rounded-xl border border-navy-200 px-5 py-3 font-bold text-navy-900 hover:border-gold-400">Open full project page</a>
      </aside>
      {inquiryOpen && (
        <div className="fixed inset-0 z-[9100] flex items-end justify-center overflow-y-auto bg-navy-950/75 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setInquiryOpen(false)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Developer project inquiry"
            className="max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const response = await fetch("/api/developer-project-inquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  projectId: project.id,
                  modelId: selectedModel?.id || null,
                  name: form.get("name"),
                  email: form.get("email"),
                  phone: form.get("phone"),
                  message: form.get("message"),
                }),
              });
              if (response.ok) setSent(true);
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Inquiry</p>
                <h2 className="font-bold text-navy-900">{selectedModel?.name || project.projectName}</h2>
              </div>
              <button type="button" onClick={() => setInquiryOpen(false)} className="rounded-full border border-navy-200 p-2 text-navy-700 hover:bg-navy-50" aria-label="Close inquiry form"><X size={18} /></button>
            </div>
            {sent ? <p className="rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">Inquiry sent. We’ll contact you soon.</p> : (
              <div className="space-y-3">
                <input name="name" required placeholder="Name" className="w-full rounded-lg border border-navy-200 px-3 py-2" />
                <input name="email" required type="email" placeholder="Email" className="w-full rounded-lg border border-navy-200 px-3 py-2" />
                <input name="phone" placeholder="Phone" className="w-full rounded-lg border border-navy-200 px-3 py-2" />
                <textarea name="message" rows={4} defaultValue={`I'm interested in ${selectedModel?.name || project.projectName}.`} className="w-full rounded-lg border border-navy-200 px-3 py-2" />
                <button className="w-full rounded-xl bg-navy-900 px-5 py-3 font-bold text-white">Submit inquiry</button>
              </div>
            )}
          </form>
        </div>
      )}
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

function ModelCard({ model, selected, onSelect, onInquire }: { model: Model; selected?: boolean; onSelect?: () => void; onInquire?: () => void }) {
  const image = model.gallery?.[0] || model.floorPlanImage || "/placeholder-property.png";
  return (
    <div className={`block w-full overflow-hidden rounded-xl border bg-white text-left transition hover:border-gold-400 ${selected ? "border-gold-400 ring-2 ring-gold-100" : "border-navy-100"}`}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
      <div className="image-zoom-frame h-36 overflow-hidden bg-navy-50"><img src={image} alt={model.name} className="zoomable-image h-full w-full object-cover" loading="lazy" /></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-navy-950">{model.name}</h4>
            <p className="text-xs font-bold uppercase text-violet-700">{model.modelType === "lot_only" ? "Lot only" : "House model"}</p>
            <p className="text-lg font-bold text-navy-900">{formatPeso(model.currentPrice)}</p>
          </div>
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-800">{model.availableUnits} available</span>
        </div>
        {model.priceDifference ? <p className={`mt-1 text-xs font-bold ${model.priceDifference > 0 ? "text-red-600" : "text-green-700"}`}>{model.priceDifference > 0 ? "+" : ""}{formatPeso(model.priceDifference)} ({model.percentageChange?.toFixed(2)}%)</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
          {model.modelType !== "lot_only" && <span className="inline-flex items-center gap-1"><BedDouble size={14} />{model.bedrooms ?? "—"} bd</span>}
          {model.modelType !== "lot_only" && <span className="inline-flex items-center gap-1"><Bath size={14} />{model.bathrooms ?? "—"} ba</span>}
          {model.modelType !== "lot_only" && <span className="inline-flex items-center gap-1"><Ruler size={14} />{model.floorArea ?? "—"} sqm floor</span>}
          <span className="inline-flex items-center gap-1"><Square size={14} />{model.lotArea ?? "—"} sqm lot</span>
          {model.modelType !== "lot_only" && <span className="inline-flex items-center gap-1"><Car size={14} />{model.parkingSlots ?? "—"} parking</span>}
          {model.modelType === "lot_only" && <span className="inline-flex items-center gap-1"><Ruler size={14} />{model.lotArea && model.currentPrice ? formatPeso(model.currentPrice / model.lotArea) : "—"} / sqm</span>}
        </div>
      </div>
      </button>
      <div className="border-t border-navy-100 p-3">
        <button type="button" onClick={onInquire} className="w-full rounded-lg bg-gold-500 px-3 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400">Inquire</button>
      </div>
    </div>
  );
}
