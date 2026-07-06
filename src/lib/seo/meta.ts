// src/lib/seo/meta.ts
import type { Metadata } from "next";
import type { Property, Neighborhood } from "@/types/property";

const SITE_URL = "https://mmpropertiesdavao.com";

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || ["null", "undefined", "n/a"].includes(text.toLowerCase())) return null;
  return text;
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function propertyMetadata(property: Property): Metadata {
  return {
    title: `${property.title} | ${property.neighborhoodName}, Davao City — ₱${property.price.toLocaleString()}`,
    description: `${property.bedrooms ?? ""} bedroom ${property.propertyTypeLabel} in ${property.neighborhoodName}, Davao City. ${
      property.floorAreaSqm ? `${property.floorAreaSqm} sqm. ` : ""
    }View photos, pricing, and schedule a viewing.`,
    openGraph: {
      title: property.title,
      images: [property.coverImageUrl],
      type: "website",
    },
    alternates: { canonical: `${SITE_URL}/property/${property.slug}` },
  };
}

export function neighborhoodMetadata(neighborhood: Neighborhood): Metadata {
  return {
    title: `${neighborhood.name} Real Estate & Properties | Davao City`,
    description: `Explore homes for sale in ${neighborhood.name}, Davao City — average prices, nearby schools and hospitals, and current listings.`,
    alternates: { canonical: `${SITE_URL}/neighborhoods/${neighborhood.slug}` },
  };
}

export function propertyJsonLd(property: Property) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description,
    url: `${SITE_URL}/property/${property.slug}`,
    image: [property.coverImageUrl],
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "PHP",
      availability: property.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: property.neighborhoodName,
      addressRegion: "Davao City",
      addressCountry: "PH",
    },
  };
}

export function neighborhoodJsonLd(neighborhood: Neighborhood) {
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `${neighborhood.name}, Davao City`,
    description: neighborhood.overview,
    url: `${SITE_URL}/neighborhoods/${neighborhood.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: neighborhood.centroid.lat,
      longitude: neighborhood.centroid.lng,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string | null | undefined; url: string | null | undefined }[]) {
  const validItems = items
    .map((item) => {
      const name = cleanText(item.name);
      const url = cleanText(item.url);
      if (!name || !url || /\/(?:null|undefined)(?:\/)?$/i.test(url)) return null;
      return { name, url: absoluteUrl(url) };
    })
    .filter((item): item is { name: string; url: string } => Boolean(item));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: validItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
