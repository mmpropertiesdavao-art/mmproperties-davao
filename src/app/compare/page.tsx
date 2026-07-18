import type { Metadata } from "next";
import { CompareClient } from "@/components/compare/CompareClient";

type PageProps = { searchParams?: Promise<{ slugs?: string }> };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const slugs = String(params?.slugs || "").split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, 4);
  const ogImage = slugs.length ? `/api/og/compare?slugs=${encodeURIComponent(slugs.join(","))}` : "/mm-social-preview.png";
  const title = slugs.length ? `Compare ${slugs.length} Davao Properties` : "Compare Davao Property Listings";
  return {
    title,
    description: "Compare Davao properties side by side, including price, location, lot area, floor area, bedrooms, bathrooms, and offer type.",
    alternates: { canonical: `${SITE_URL}/compare${slugs.length ? `?slugs=${encodeURIComponent(slugs.join(","))}` : ""}` },
    openGraph: {
      title,
      description: "Side-by-side Davao property comparison from MM Properties.",
      url: `${SITE_URL}/compare${slugs.length ? `?slugs=${encodeURIComponent(slugs.join(","))}` : ""}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Compare Davao properties" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Side-by-side Davao property comparison from MM Properties.",
      images: [ogImage],
    },
  };
}

export default function ComparePage() {
  return <CompareClient />;
}
