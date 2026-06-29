import { NextResponse } from "next/server";
import { getActiveDeveloperProjects } from "@/lib/developer-inventory";

export async function GET() {
  try {
    const projects = await getActiveDeveloperProjects(48);
    return NextResponse.json({ results: projects });
  } catch (error) {
    console.warn("Developer projects unavailable", error);
    return NextResponse.json({ results: [] });
  }
}
