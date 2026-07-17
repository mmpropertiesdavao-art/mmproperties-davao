import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { DeveloperProjectCard } from "@/components/developer/DeveloperProjectCard";
import { getDeveloperProfileBySlug } from "@/lib/developer-inventory";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getDeveloperProfileBySlug(slug);
  if (!payload) return {};
  const { developer, projects } = payload;
  return {
    title: `${developer.name} Projects in Davao`,
    description: projects.length
      ? `Browse ${developer.name} developer projects, model units, lots, and inventory in Davao.`
      : `${developer.name} developer page is being updated. Contact MM Properties for project inquiries.`,
    alternates: { canonical: `/developers/${developer.slug}` },
    openGraph: {
      title: `${developer.name} Projects in Davao`,
      description: projects.length
        ? `View available ${developer.name} projects listed on MM Properties.`
        : `Contact MM Properties for ${developer.name} project inquiries.`,
      images: developer.logoUrl ? [developer.logoUrl] : undefined,
    },
  };
}

export default async function DeveloperPage({ params }: PageProps) {
  const { slug } = await params;
  const payload = await getDeveloperProfileBySlug(slug);
  if (!payload) notFound();

  const { developer, projects } = payload;

  return (
    <main className="bg-slate-50">
      <section className="bg-navy-900 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white p-3 shadow-xl">
            {developer.logoUrl ? <img src={developer.logoUrl} alt={`${developer.name} logo`} className="max-h-full max-w-full object-contain" /> : <Building2 className="text-navy-500" size={36} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-gold-300">Developer projects</p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">{developer.name}</h1>
            {developer.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-navy-100 sm:text-base">{developer.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {developer.contactNumber && <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Phone size={15} />{developer.contactNumber}</span>}
              {developer.email && <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Mail size={15} />{developer.email}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {projects.length ? (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-navy-950">Available projects</h2>
                <p className="mt-1 text-sm text-navy-500">{projects.length} active project{projects.length === 1 ? "" : "s"} from {developer.name}</p>
              </div>
              <Link href="/search?propertyType=new-development" className="rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-bold text-navy-800 hover:border-gold-400">
                Browse all developments
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <DeveloperProjectCard key={project.id} {...project} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-navy-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
              <Building2 size={30} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-navy-950">We are updating this page</h2>
            <p className="mx-auto mt-3 max-w-2xl text-navy-500">
              Contact us if you have inquiries for {developer.name} or one of their projects. MM Properties can help check project availability, pricing, and next steps.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/about" className="rounded-lg bg-gold-500 px-5 py-3 font-bold text-navy-950">Contact us</Link>
              <Link href="/search?propertyType=new-development" className="rounded-lg border border-navy-200 px-5 py-3 font-bold text-navy-800">View other developments</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
