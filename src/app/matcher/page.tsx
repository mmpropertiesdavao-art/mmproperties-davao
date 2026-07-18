import type { Metadata } from "next";
import MMPulse from "@/components/matcher/MMPulseClient";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";

function serializeSearchParams(params?: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value) query.set(key, value);
  });
  return query.toString();
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = serializeSearchParams(params);
  const hasSharedFilters = Boolean(query);
  const ogImage = hasSharedFilters ? `/api/og/matcher?${query}` : "/mm-social-preview.png";
  const title = hasSharedFilters ? "MM Pulse Property Matches" : "MM Pulse";
  return {
    title,
    description: "Smarter Davao property decisions for buyers, investors, and sellers. Match listings and explore indicative property value ranges with transparent local data.",
    alternates: { canonical: `${SITE_URL}/matcher${query ? `?${query}` : ""}` },
    openGraph: {
      title,
      description: "Get Davao property recommendations based on location, budget, property type, and priorities.",
      url: `${SITE_URL}/matcher${query ? `?${query}` : ""}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "MM Pulse Davao property matches" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "Get Davao property recommendations based on location, budget, property type, and priorities.",
      images: [ogImage],
    },
  };
}

export default function MatcherPage() {
  return <MMPulse />;
}
