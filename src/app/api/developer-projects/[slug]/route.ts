import { NextResponse } from "next/server";
import { getDeveloperProjectBySlug } from "@/lib/developer-inventory";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getDeveloperProjectBySlug(slug);
  if (!payload) return NextResponse.json({ error: "Developer project not found." }, { status: 404 });
  return NextResponse.json(payload);
}
