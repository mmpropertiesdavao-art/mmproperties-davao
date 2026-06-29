import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Building2, Car, MapPin, Ruler, Square } from "lucide-react";
import { getDeveloperProjectBySlug } from "@/lib/developer-inventory";

type PageProps = { params: Promise<{ slug: string }> };

function formatPeso(value: number | null | undefined) {
  if (!value) return "Price on request";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getDeveloperProjectBySlug(slug);
  if (!payload) return {};
  const project = payload.project as any;
  return {
    title: project.seoTitle || `${project.projectName} by ${project.developerName}`,
    description: project.seoDescription || project.description || `Browse house models and inventory for ${project.projectName}.`,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.seoTitle || `${project.projectName} by ${project.developerName}`,
      description: project.seoDescription || project.description || `Browse available house models and inventory.`,
      images: project.heroImage ? [project.heroImage] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getDeveloperProjectBySlug(slug);
  if (!payload) notFound();
  const project = payload.project as any;
  const models = payload.models as any[];
  const startingPrice = models.reduce<number | null>((lowest, model) => {
    if (!model.currentPrice) return lowest;
    return lowest === null ? model.currentPrice : Math.min(lowest, model.currentPrice);
  }, null);
  const gallery = [project.heroImage, ...(project.gallery || [])].filter(Boolean);

  return (
    <main className="bg-slate-50">
      <section className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-gold-400">New Development</p>
            <h1 className="mt-2 text-4xl font-bold">{project.projectName}</h1>
            <p className="mt-2 text-lg text-gold-200">{project.developerName}</p>
            <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-200">
              <MapPin size={18} className="mt-1 shrink-0 text-gold-400" />
              {[project.address, project.barangay, project.city, project.province].filter(Boolean).join(", ")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold uppercase">{statusLabel(project.status)}</span>
              <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase text-navy-950">Starting from {formatPeso(startingPrice)}</span>
            </div>
          </div>
          <div className="image-zoom-frame overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">
            <img src={project.heroImage || "/placeholder-property.png"} alt={project.projectName} className="zoomable-image aspect-[4/3] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {project.description && <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-navy-950">Project overview</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-navy-600">{project.description}</p></article>}
            {project.amenities?.length > 0 && <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-navy-950">Amenities</h2><div className="mt-3 flex flex-wrap gap-2">{project.amenities.map((amenity: string) => <span key={amenity} className="rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-navy-800">{amenity}</span>)}</div></article>}
            {gallery.length > 1 && <article className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-navy-950">Project gallery</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((image: string, index: number) => <div key={`${image}-${index}`} className="image-zoom-frame overflow-hidden rounded-xl bg-navy-50"><img src={image} alt={`${project.projectName} ${index + 1}`} className="zoomable-image aspect-[4/3] w-full object-cover" loading="lazy" /></div>)}</div></article>}
            <article className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-navy-950">Available house models</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {models.map((model) => <ModelCard key={model.id} model={model} />)}
              </div>
            </article>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-bold text-navy-950">Developer</h2>
              {project.developerLogo && <img src={project.developerLogo} alt={project.developerName} className="mt-3 h-16 w-16 rounded-full border object-cover" />}
              <p className="mt-3 font-semibold">{project.developerName}</p>
              {project.developerWebsite && <a href={project.developerWebsite} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-semibold text-gold-700">Visit developer website</a>}
              {project.developerContactNumber && <p className="mt-2 text-sm text-navy-500">{project.developerContactNumber}</p>}
              {project.developerEmail && <p className="text-sm text-navy-500">{project.developerEmail}</p>}
            </div>
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-bold text-navy-950">Inventory summary</h2>
              <div className="mt-3 grid gap-2 text-sm">
                <Info icon={<Building2 size={16} />} label="Models" value={String(models.length)} />
                <Info icon={<Square size={16} />} label="Available units" value={String(models.reduce((sum, model) => sum + Number(model.availableUnits || 0), 0))} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2"><span className="flex items-center gap-2 text-navy-500">{icon}{label}</span><strong>{value}</strong></div>;
}

function ModelCard({ model }: { model: any }) {
  const image = model.gallery?.[0] || model.floorPlanImage || "/placeholder-property.png";
  return (
    <article className="overflow-hidden rounded-xl border border-navy-100">
      <div className="image-zoom-frame h-48 overflow-hidden bg-navy-50"><img src={image} alt={model.name} className="zoomable-image h-full w-full object-cover" loading="lazy" /></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-bold text-navy-950">{model.name}</h3><p className="text-lg font-bold text-navy-900">{formatPeso(model.currentPrice)}</p></div>
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-800">{model.availableUnits} available</span>
        </div>
        {model.description && <p className="mt-2 line-clamp-3 text-sm text-navy-500">{model.description}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600">
          <span className="inline-flex items-center gap-1"><BedDouble size={14} />{model.bedrooms ?? "—"} bd</span>
          <span className="inline-flex items-center gap-1"><Bath size={14} />{model.bathrooms ?? "—"} ba</span>
          <span className="inline-flex items-center gap-1"><Ruler size={14} />{model.floorArea ?? "—"} sqm floor</span>
          <span className="inline-flex items-center gap-1"><Square size={14} />{model.lotArea ?? "—"} sqm lot</span>
          <span className="inline-flex items-center gap-1"><Car size={14} />{model.parkingSlots ?? "—"} parking</span>
        </div>
      </div>
    </article>
  );
}
