import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { getActiveDevelopers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Davao Property Developers",
  description: "Browse active Davao developer partners and new development projects listed on MM Properties.",
  alternates: { canonical: "/developers" },
};

export default async function DevelopersPage() {
  const developers = await getActiveDevelopers(false);

  return (
    <main className="bg-slate-50">
      <section className="bg-navy-900 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-gold-300">Developer directory</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Browse Davao projects by developer</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-navy-100 sm:text-base">
            Explore developer inventory, project locations, model units, lots, and inquiry options in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {developers.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {developers.map((developer) => (
              <Link
                key={developer.id}
                href={`/developers/${developer.slug}`}
                className="group flex min-h-36 items-center gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-gold-400 hover:shadow-lg"
              >
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-navy-100 bg-navy-50">
                  {developer.logoUrl ? (
                    <img src={developer.logoUrl} alt={`${developer.name} logo`} className="max-h-full max-w-full object-contain p-2 transition group-hover:scale-105" />
                  ) : (
                    <Building2 className="text-navy-400" size={30} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-navy-950">{developer.name}</span>
                  <span className="mt-1 block text-sm text-navy-500">View developer projects</span>
                  <span className="mt-3 inline-flex text-sm font-bold text-gold-700">Open page →</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold text-navy-950">Developer pages are being updated</h2>
            <p className="mt-2 text-navy-500">Contact MM Properties if you have inquiries about a developer or one of their projects.</p>
            <Link href="/about" className="mt-5 inline-flex rounded-lg bg-gold-500 px-5 py-3 font-bold text-navy-950">Contact us</Link>
          </div>
        )}
      </section>
    </main>
  );
}
