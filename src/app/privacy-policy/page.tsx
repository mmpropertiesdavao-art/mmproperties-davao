import type { Metadata } from "next";
import { getSitePage } from "@/lib/sitePages";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
  const page = await getSitePage("privacy-policy");

  return (
    <main className="bg-slate-50 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-gold-700">MM Properties</p>
        <h1 className="mt-3 text-3xl font-bold text-navy-950">{page?.title || "Privacy Policy"}</h1>
        {page?.updatedAt && <p className="mt-2 text-xs text-navy-400">Updated {new Date(page.updatedAt).toLocaleDateString("en-PH")}</p>}
        <div className="mt-6 whitespace-pre-line text-sm leading-7 text-navy-700">
          {page?.content}
        </div>
      </article>
    </main>
  );
}
