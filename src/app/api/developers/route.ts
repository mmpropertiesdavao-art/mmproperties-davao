import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/server";
export async function GET(){const{rows}=await db.query({text:`SELECT id,name,slug,logo_url AS "logoUrl",description,website,is_featured AS "isFeatured" FROM developers WHERE is_active=true AND approval_status='approved' AND merged_into_id IS NULL ORDER BY is_featured DESC,name`,values:[]});return NextResponse.json(rows)}
