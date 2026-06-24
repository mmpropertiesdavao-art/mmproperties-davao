import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/supabase/server";
export async function GET(req:NextRequest){const q=req.nextUrl.searchParams.get("q")?.trim()||"";const{rows}=await db.query({text:`SELECT id,name,kind FROM places WHERE status='active' AND ($1='' OR name ILIKE '%'||$1||'%') ORDER BY name LIMIT 100`,values:[q]});return NextResponse.json(rows)}
