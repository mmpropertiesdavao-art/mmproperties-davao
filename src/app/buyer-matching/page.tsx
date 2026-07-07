import type { Metadata } from "next";
import Link from "next/link";
import { Home, MapPin, Sparkles } from "lucide-react";
import { MultiStepLeadForm } from "@/components/leads/forms/MultiStepLeadForm";

export const metadata: Metadata = {
  title: "Free Buyer Matching | MM Properties Davao",
  description:
    "Tell MM Properties what property you are looking for in Davao and get recommendations based on your budget, preferred location, and buying timeline.",
  alternates: {
    canonical: "/buyer-matching",
  },
};

export default function BuyerMatchingPage() {
  return (
    <main className="bg-navy-50">
      <section className="px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-gold-700">
              Free buyer matching
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-navy-950 sm:text-4xl lg:text-5xl">
              Find Your Perfect Property in Davao
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-navy-600">
              Share your budget, preferred location, property type, and timeline.
              MM Properties will help shortlist homes, condos, lots, or commercial
              properties that fit what you are actually looking for.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
              <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
                <MapPin className="text-gold-600" size={22} />
                <p className="mt-2 text-sm font-bold text-navy-900">Location fit</p>
                <p className="mt-1 text-xs leading-5 text-navy-500">
                  Choose the Davao area you prefer.
                </p>
              </div>
              <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
                <Home className="text-gold-600" size={22} />
                <p className="mt-2 text-sm font-bold text-navy-900">Property type</p>
                <p className="mt-1 text-xs leading-5 text-navy-500">
                  House, condo, lot, or commercial.
                </p>
              </div>
              <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
                <Sparkles className="text-gold-600" size={22} />
                <p className="mt-2 text-sm font-bold text-navy-900">Better shortlist</p>
                <p className="mt-1 text-xs leading-5 text-navy-500">
                  We use your needs to recommend smarter.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link
                href="/search"
                className="rounded-xl border border-navy-200 bg-white px-4 py-3 font-bold text-navy-900 hover:border-gold-400"
              >
                Browse listings first
              </Link>
              <Link
                href="/seller-valuation"
                className="rounded-xl border border-navy-200 bg-white px-4 py-3 font-bold text-navy-900 hover:border-gold-400"
              >
                Selling instead?
              </Link>
            </div>
          </div>

          <MultiStepLeadForm kind="buyer" sourcePage="/buyer-matching" />
        </div>
      </section>
    </main>
  );
}
