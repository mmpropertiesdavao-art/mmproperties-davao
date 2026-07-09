import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { db } from "@/lib/supabase/server";
import { combinedFilterSearchQuery } from "@/lib/postgis/queries";
import type { Property } from "@/types/property";
import { PropertyCard } from "@/components/property/PropertyCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request Received",
  description:
    "Thank you for contacting MM Properties Davao. Your request has been received and a property consultant will contact you shortly.",
  robots: {
    index: false,
    follow: false,
  },
};

function cardProps(p: Property) {
  return { id: p.id, slug: p.slug, title: p.title, price: p.price, bedrooms: p.bedrooms, bathrooms: p.bathrooms, floorAreaSqm: p.floorAreaSqm, lotAreaSqm: p.lotAreaSqm, coverImageUrl: p.coverImageUrl, neighborhoodName: p.neighborhoodName, barangay: p.barangay, isForeclosed: p.isForeclosed, propertyType: p.propertyType, listingIntent: p.listingIntent, availability: p.availability, rentPrice: p.rentPrice, financingAvailable: p.financingAvailable, assumeBalanceAvailable: p.assumeBalanceAvailable, previousPrice: p.previousPrice, agentName: p.agentName, agencyName: p.agencyName, parkingSpaces: p.parkingSpaces, daysListed: p.daysListed, viewCount: p.viewCount, saveCount: p.saveCount };
}

export default async function ThankYouPage() {
  const { rows } = await db.query(combinedFilterSearchQuery({ pageSize: 3 }));
  const properties = (rows as Property[]).filter((property) => property.status === "active" && property.availability === "available").slice(0, 3);

  return (
    <main className="bg-white px-4 py-10 sm:px-6 lg:py-16">
      <section className="mx-auto max-w-3xl rounded-3xl bg-navy-900 p-8 text-center text-white shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[.22em] text-gold-300">Request received</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Thank you for contacting MM Properties Davao.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-navy-100">
          Your request has been received. One of our property consultants will contact you shortly.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="tel:+639000000000" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 font-bold text-navy-950">
            <Phone size={18} /> Call Now
          </a>
          <a href="https://m.me/MMPropertiesDavao" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 px-5 font-bold text-white">
            <MessageCircle size={18} /> Messenger
          </a>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 font-bold text-white">
            Back to Homepage
          </Link>
        </div>
      </section>

      {properties.length > 0 && (
        <section className="mx-auto mt-12 max-w-6xl">
          <h2 className="text-2xl font-bold text-navy-950">Featured Properties</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {properties.map((property) => <PropertyCard key={property.id} {...cardProps(property)} />)}
          </div>
        </section>
      )}
    </main>
  );
}
