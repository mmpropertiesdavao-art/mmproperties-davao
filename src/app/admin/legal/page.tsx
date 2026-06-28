import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { getEditableSitePages } from "@/lib/sitePages";
import { LegalPageEditor } from "./LegalPageEditor";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  await requireRole(["admin"]);
  const pages = await getEditableSitePages();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">Site legal pages</p>
            <h1 className="mt-1 text-2xl font-bold text-navy-950">Privacy Policy & Terms</h1>
            <p className="mt-1 text-sm text-navy-500">
              Update public legal pages shown in the footer. Replace starter text with your final legal wording before launch.
            </p>
          </div>
          <Link href="/admin/content" className="rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 hover:border-gold-400">
            Back to content
          </Link>
        </div>
        <LegalPageEditor pages={pages} />
      </div>
    </main>
  );
}
