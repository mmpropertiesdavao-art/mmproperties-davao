export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { blocksToText, normalizeBlocks } from "@/lib/blog-blocks";

const CATEGORIES = new Set(["buyer_update","seller_update","buying_guide","selling_guide","market_update","neighborhood_guide"]);

export async function GET() {
  const actor = await requireRole(["admin"]); if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  try {
    const { rows } = await db.query({ text: `SELECT id,title,slug,category,content,content_json AS "contentJson",cover_image_url AS "coverImageUrl",excerpt,seo_title AS "seoTitle",meta_description AS "metaDescription",published_at AS "publishedAt",created_at AS "createdAt",updated_at AS "updatedAt",is_featured AS "isFeatured",featured_position AS "featuredPosition" FROM blog_posts ORDER BY updated_at DESC,created_at DESC`, values: [] });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to load blog posts", error);
    return NextResponse.json({ error: "Could not load blog posts." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await requireRole(["admin"]); if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  try {
    const body = await request.json(); const parsed = parseBody(body); if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const slug = slugify(parsed.slug || parsed.title, Date.now().toString(36));
    const authorId = actor.userId === "00000000-0000-0000-0000-000000000000" ? null : actor.userId;
    const { rows } = await db.query({ text: `WITH cleared AS (UPDATE blog_posts SET featured_position=NULL,is_featured=false WHERE featured_position=$13::int AND $13::int IS NOT NULL RETURNING id) INSERT INTO blog_posts(title,slug,category,content,content_json,cover_image_url,excerpt,seo_title,meta_description,author_id,published_at,is_featured,featured_position,updated_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::uuid,$11,$12,$13,now()) RETURNING id,slug`, values: [parsed.title,slug,parsed.category,parsed.content,JSON.stringify(parsed.blocks),parsed.coverImageUrl,parsed.excerpt,parsed.seoTitle,parsed.metaDescription,authorId,parsed.publishedAt,parsed.featuredPosition!==null,parsed.featuredPosition] });
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create blog post", error);
    return NextResponse.json({ error: databaseMessage(error, "Could not create the blog post.") }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await requireRole(["admin"]); if (!actor) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  try {
    const body = await request.json(); const id = String(body.id || ""); const parsed = parseBody(body); if (!id || "error" in parsed) return NextResponse.json({ error: "error" in parsed ? parsed.error : "Post id is required." }, { status: 400 });
    const slug = slugify(parsed.slug || parsed.title);
    const { rows } = await db.query({ text: `WITH cleared AS (UPDATE blog_posts SET featured_position=NULL,is_featured=false WHERE featured_position=$13::int AND id<>$14::uuid AND $13::int IS NOT NULL RETURNING id) UPDATE blog_posts SET title=$1,slug=$2,category=$3,content=$4,content_json=$5::jsonb,cover_image_url=$6,excerpt=$7,seo_title=$8,meta_description=$9,published_at=$11,is_featured=$12,featured_position=$13,updated_at=now() WHERE id=$14::uuid RETURNING id,slug`, values: [parsed.title,slug,parsed.category,parsed.content,JSON.stringify(parsed.blocks),parsed.coverImageUrl,parsed.excerpt,parsed.seoTitle,parsed.metaDescription,actor.userId,parsed.publishedAt,parsed.featuredPosition!==null,parsed.featuredPosition,id] });
    if (!rows[0]) return NextResponse.json({ error: "Post not found." }, { status: 404 }); return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Failed to update blog post", error);
    return NextResponse.json({ error: databaseMessage(error, "Could not update the blog post.") }, { status: 500 });
  }
}

function databaseMessage(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code || "") : "";
  if (code === "23505") return "That blog URL slug or featured position is already in use. Choose another and try again.";
  if (code === "23503") return "The selected author account is not available. Sign in again and retry.";
  return fallback;
}

function parseBody(body: any) {
  const title=String(body.title||"").trim(); const blocks=normalizeBlocks(body.contentJson, String(body.content||"")); const content=blocksToText(blocks).trim(); const category=CATEGORIES.has(body.category)?body.category:"market_update";
  if(title.length<5||content.length<20) return { error:"Add a title and at least 20 characters of content." } as const;
  const status=String(body.status||"draft"); let publishedAt:string|null=null;
  if(status==="published") publishedAt=body.publishedAt && new Date(body.publishedAt)<=new Date() ? new Date(body.publishedAt).toISOString() : new Date().toISOString();
  if(status==="scheduled") { const date=new Date(body.scheduledAt); if(!body.scheduledAt||Number.isNaN(date.valueOf())||date<=new Date()) return {error:"Choose a future publishing date."} as const; publishedAt=date.toISOString(); }
  const position=body.featuredPosition===""||body.featuredPosition==null?null:Number(body.featuredPosition); if(position!==null&&![1,2,3].includes(position)) return {error:"Featured position must be 1, 2, or 3."} as const;
  return {title,blocks,content,category,slug:String(body.slug||""),coverImageUrl:String(body.coverImageUrl||"")||null,excerpt:String(body.excerpt||"").trim()||content.slice(0,180),seoTitle:String(body.seoTitle||"").trim()||title,metaDescription:String(body.metaDescription||"").trim()||content.slice(0,155),publishedAt,featuredPosition:position};
}

