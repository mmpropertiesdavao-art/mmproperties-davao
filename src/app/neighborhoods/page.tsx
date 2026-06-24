import Link from "next/link";
import { db } from "@/lib/supabase/server";

type Neighborhood = { id: string; name: string; slug: string; overview: string | null; listingCount: number };

export default async function NeighborhoodsPage() {
  const { rows } = await db.query<Neighborhood>({ text: `SELECT n.id,n.name,n.slug,n.overview,COUNT(p.id)::int AS "listingCount" FROM neighborhoods n LEFT JOIN properties p ON p.neighborhood_id=n.id AND p.status='active' GROUP BY n.id ORDER BY n.name`, values: [] });
  return <main className="mx-auto max-w-6xl px-6 py-12"><h1 className="text-3xl font-semibold text-navy-900">Davao neighborhoods</h1><p className="mt-2 max-w-2xl text-navy-500">Explore local guides and available properties by area.</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(n=><Link key={n.id} href={`/neighborhoods/${n.slug}`} className="rounded-xl border border-navy-100 bg-white p-6 transition hover:border-gold-400 hover:shadow-md"><h2 className="text-xl font-semibold text-navy-900">{n.name}</h2><p className="mt-2 line-clamp-3 text-sm text-navy-500">{n.overview||"View properties and local information for this Davao neighborhood."}</p><p className="mt-4 text-sm font-medium text-gold-700">{n.listingCount} available listing{n.listingCount===1?"":"s"}</p></Link>)}</div></main>;
}
