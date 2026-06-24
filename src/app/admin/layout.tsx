import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole(["admin", "agent", "seller"]);
  if (!actor) redirect("/login?next=/seller");
  return <><div className="border-b border-navy-100 bg-white"><nav className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-6 py-3 text-sm font-medium text-navy-700"><Link href="/seller">Dashboard</Link><Link href="/admin/analytics">Analytics</Link><Link href="/admin/listings/new">New listing</Link><Link href="/admin/listings/edit">Edit listings</Link><Link href="/admin/listings/import">Bulk import</Link><Link href="/admin/locations">Locations</Link><Link href="/admin/photos">Photos</Link>{actor.role === "admin"&&<><Link href="/admin/developers">Developers</Link><Link href="/admin/places">Places</Link><Link href="/admin/collaborators">Applications</Link><Link href="/admin/blog">Blog posts</Link><Link href="/admin/settings/payments">Payments (future)</Link></>}</nav></div>{children}</>;
}
