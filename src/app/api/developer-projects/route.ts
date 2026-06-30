import { NextResponse } from "next/server";
import { getActiveDeveloperProjects } from "@/lib/developer-inventory";

function numberOrNull(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const projects = await getActiveDeveloperProjects(48, {
      query: params.get("q"),
      developerName: params.get("developerName"),
      neighborhoodId: params.get("neighborhoodId"),
      barangay: params.get("barangay"),
      minPrice: numberOrNull(params.get("minPrice")),
      maxPrice: numberOrNull(params.get("maxPrice")),
      minBedrooms: numberOrNull(params.get("minBedrooms")),
      minBathrooms: numberOrNull(params.get("minBathrooms")),
    });
    return NextResponse.json({ results: projects });
  } catch (error) {
    console.warn("Developer projects unavailable", error);
    return NextResponse.json({ results: [] });
  }
}
