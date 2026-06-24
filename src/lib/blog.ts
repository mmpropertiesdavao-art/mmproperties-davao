import { db } from "@/lib/supabase/server";
import { normalizeBlocks, type BlogBlock } from "@/lib/blog-blocks";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  coverImageUrl: string | null;
  publishedAt: string;
  isFeatured: boolean;
  featuredPosition: number | null;
  excerpt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  contentJson: BlogBlock[];
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const { rows } = await db.query({
    text: `SELECT id,title,slug,category,content,content_json AS "contentJson",cover_image_url AS "coverImageUrl",published_at AS "publishedAt",is_featured AS "isFeatured",featured_position AS "featuredPosition",excerpt,seo_title AS "seoTitle",meta_description AS "metaDescription" FROM blog_posts WHERE published_at IS NOT NULL AND published_at <= now() ORDER BY published_at DESC`,
    values: [],
  });
  return rows.map((row:any)=>({...row,contentJson:normalizeBlocks(row.contentJson,row.content)})) as BlogPost[];
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const { rows } = await db.query({
    text: `SELECT id,title,slug,category,content,content_json AS "contentJson",cover_image_url AS "coverImageUrl",published_at AS "publishedAt",is_featured AS "isFeatured",featured_position AS "featuredPosition",excerpt,seo_title AS "seoTitle",meta_description AS "metaDescription" FROM blog_posts WHERE slug=$1 AND published_at IS NOT NULL AND published_at<=now() LIMIT 1`,
    values: [slug],
  });
  const row=rows[0] as any; return row?({...row,contentJson:normalizeBlocks(row.contentJson,row.content)} as BlogPost):null;
}

export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  buying_guide: "Buyer guides",
  selling_guide: "Seller guides",
  buyer_update: "Buyer updates",
  seller_update: "Seller updates",
  market_update: "Davao market updates",
  neighborhood_guide: "Neighborhood guides",
};
