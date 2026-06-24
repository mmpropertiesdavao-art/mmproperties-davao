import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    route: "callback reached",
    timestamp: new Date().toISOString(),
  });
}