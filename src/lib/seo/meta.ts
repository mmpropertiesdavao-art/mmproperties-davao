// src/lib/seo/meta.ts
import type { Metadata } from "next";
import type { Property, Neighborhood } from "@/types/property";

const SITE_URL = "https://davaopropertyfinder.com"; // placeholder — set to the real domain at launch

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

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
