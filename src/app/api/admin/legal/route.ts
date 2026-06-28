import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { db } from "@/lib/supabase/server";

const ALLOWED_SLUGS = new Set(["privacy-policy", "terms-of-service"]);

async function ensureSitePagesTable() {
  await db.query({
    text: `
      CREATE TABLE IF NOT EXISTS site_pages (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `,
    values: [],
  });
}

export async function PATCH(request: Request) {
  await requireRole(["admin"]);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slug = String(body.slug || "").trim();
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  if (title.length < 3 || content.length < 20) {
    return NextResponse.json({ error: "Add a title and at least 20 characters of content." }, { status: 400 });
  }

  try {
    await ensureSitePagesTable();

    const { rows } = await db.query<{ slug: string }>({
      text: `
        INSERT INTO site_pages (slug, title, content, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (slug)
        DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = now()
        RETURNING slug
      `,
      values: [slug, title, content],
    });

    return NextResponse.json({ ok: true, slug: rows[0]?.slug || slug });
  } catch (error) {
    console.error("Could not save legal page", error);
    return NextResponse.json({ error: "Could not save legal page. Please check the database connection and try again." }, { status: 500 });
  }
}
