// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getAllActiveProperties, getAllNeighborhoods } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mmpropertiesdavao.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [properties, neighborhoods, posts] = await Promise.all([getAllActiveProperties(), getAllNeighborhoods(), getPublishedPosts()]);

  return [
    { url: SITE_URL, priority: 1, changeFrequency: "daily" },
    { url: `${SITE_URL}/search`, priority: 0.9, changeFrequency: "daily" },
    { url: `${SITE_URL}/guides`, priority: 0.6, changeFrequency: "weekly" },
    ...posts.map((post) => ({
      url: `${SITE_URL}/guides/${post.slug}`,
      priority: 0.7,
      changeFrequency: "monthly" as const,
      lastModified: post.updatedAt || post.publishedAt,
    })),
    { url: `${SITE_URL}/matcher`, priority: 0.6, changeFrequency: "monthly" },
    ...neighborhoods.map((n) => ({
      url: `${SITE_URL}/neighborhoods/${n.slug}`,
      priority: 0.8,
      changeFrequency: "weekly" as const,
    })),
    ...properties.map((p) => ({
      url: `${SITE_URL}/property/${p.slug}`,
      priority: 0.6,
      changeFrequency: "weekly" as const,
      lastModified: p.updatedAt,
    })),
  ];
}
