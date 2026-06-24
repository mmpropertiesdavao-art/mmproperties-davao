export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

export default async function SellerDashboard() {
  const actor = await requireRole(["seller", "agent", "admin"]);
  if (!actor) redirect("/login?next=/seller");

  const { rows } = await db.query<{ listing_count: number }>({
    text: `SELECT COUNT(*)::int AS listing_count FROM properties p LEFT JOIN agents a ON a.id = p.agent_id WHERE $1 = 'admin' OR ($1 = 'seller' AND p.seller_id = $2::uuid) OR ($1 = 'agent' AND a.user_id = $2::uuid)`,
    values: [actor.role, actor.userId],
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Partner dashboard</p>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900">Manage your Davao listings</h1>
      <p className="mt-2 text-navy-500">You currently manage {rows[0]?.listing_count ?? 0} listing(s).</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard href="/admin/listings/new" title="Add a listing" text="Enter details, choose the exact map pin, and upload photos." />
        <DashboardCard href="/admin/listings/edit" title="Edit listings" text="Update posted details, price, status, address, and map pin." />
        <DashboardCard href="/admin/listings/import" title="Bulk import" text="Review a spreadsheet and pin multiple listings before import." />
        <DashboardCard href="/admin/locations" title="Fix map pins" text="Set exact locations for listings that already exist." />
        <DashboardCard href="/admin/photos" title="Manage photos" text="Add ordered photo batches to listings you manage." />
        <DashboardCard href="/admin/analytics" title="Listing analytics" text="Track days listed, views, saves, inquiries, and attributed leads." />
      </div>
    </div>
  );
}

function DashboardCard({ href, title, text }: { href: string; title: string; text: string }) {
  return <Link href={href} className="admin-dashboard-card rounded-xl border border-navy-100 bg-white p-5 transition hover:border-gold-400 hover:shadow-md"><h2 className="font-semibold text-navy-900">{title}</h2><p className="mt-2 text-sm text-navy-500">{text}</p></Link>;
}
