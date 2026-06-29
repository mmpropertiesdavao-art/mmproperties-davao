import { NextResponse } from "next/server";
import { getActiveDeveloperProjects } from "@/lib/developer-inventory";

export async function GET() {
  const projects = await getActiveDeveloperProjects(48);
  return NextResponse.json({ results: projects });
}
