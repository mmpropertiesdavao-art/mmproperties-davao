import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

type Row = {
  id: string;
  publicId: string;
  title: string;
  slug: string;
  status: string;
  availability: string;
  daysListed: number;
  views: number;
  saves: number;
  inquiries: number;
  attributedLeads: number;
  matcherViews: number;
  matcherClicks: number;
};

export default async function Page() {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) redirect("/login?next=/admin/analytics");

  const { rows } = await db.query<Row>({
    text: `SELECT p.id,p.public_id AS "publicId",p.title,p.slug,p.status,p.availability,EXTRACT(day FROM now()-p.created_at)::int AS "daysListed",(SELECT COUNT(*)::int FROM property_views v WHERE v.property_id=p.id) views,(SELECT COUNT(*)::int FROM favorites f WHERE f.property_id=p.id) saves,(SELECT COUNT(*)::int FROM inquiries i WHERE i.property_id=p.id) inquiries,(SELECT COUNT(*)::int FROM inquiries i WHERE i.property_id=p.id AND i.agent_id=p.agent_id AND p.agent_id IS NOT NULL) "attributedLeads",(SELECT COUNT(*)::int FROM matcher_events m WHERE m.property_id=p.id AND m.event_type='result_view') "matcherViews",(SELECT COUNT(*)::int FROM matcher_events m WHERE m.property_id=p.id AND m.event_type IN('listing_click','contact_click')) "matcherClicks" FROM properties p LEFT JOIN agents a ON a.id=p.agent_id WHERE $1::text = 'admin' OR ($1::text = 'seller' AND p.seller_id=$2::uuid) OR ($1::text = 'agent' AND a.user_id=$2::uuid) ORDER BY p.created_at DESC`,
    values: [actor.role, actor.userId],
  });

  const total = (key: keyof Row) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold">Listing analytics</h1>
      <p className="mt-2 text-sm text-navy-500">Website, MM Pulse, save, inquiry, and collaborator attribution activity.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat l="Total views" v={total("views")} />
        <Stat l="Total saves" v={total("saves")} />
        <Stat l="Inquiries" v={total("inquiries")} />
        <Stat l="MM Pulse impressions" v={total("matcherViews")} />
        <Stat l="MM Pulse clicks" v={total("matcherClicks")} />
      </div>

      <div className="responsive-card-table mt-7 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-navy-50">
            <tr>
              {["Listing", "Status", "Days", "Views", "Saves", "Inquiries", "Attributed", "Pulse views", "Pulse clicks", "Manage"].map((heading) => (
                <th key={heading} className="p-3">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td data-label="Listing" className="p-3">
                  <p className="text-xs text-gold-700">{row.publicId}</p>
                  <Link href={`/property/${row.slug}`} className="font-medium">{row.title}</Link>
                </td>
                <td data-label="Status" className="p-3 capitalize">{row.availability || row.status}</td>
                <td data-label="Days" className="p-3">{row.daysListed}</td>
                <td data-label="Views" className="p-3">{row.views}</td>
                <td data-label="Saves" className="p-3">{row.saves}</td>
                <td data-label="Inquiries" className="p-3">{row.inquiries}</td>
                <td data-label="Attributed" className="p-3">{row.attributedLeads}</td>
                <td data-label="Pulse views" className="p-3">{row.matcherViews}</td>
                <td data-label="Pulse clicks" className="p-3">{row.matcherClicks}</td>
                <td data-label="Manage" className="p-3">
                  <Link href={`/admin/listings/${row.id}/edit`} className="text-gold-700 underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: number }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-navy-500">{l}</p>
      <p className="text-3xl font-semibold">{v.toLocaleString()}</p>
    </div>
  );
}
