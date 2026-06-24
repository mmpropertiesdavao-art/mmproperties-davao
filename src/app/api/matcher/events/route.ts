export const dynamic = 'force-dynamic';

import{NextRequest,NextResponse}from"next/server";import{db}from"@/lib/supabase/server";const TYPES=new Set(["result_view","listing_click","compare_click","save_click","contact_click"]);
export async function POST(r:NextRequest){try{const b=await r.json();const visitorId=String(b.visitorId||"").slice(0,120),type=String(b.eventType||"");const ids=(Array.isArray(b.propertyIds)?b.propertyIds:[b.propertyId]).filter(Boolean).slice(0,25);if(!visitorId||!TYPES.has(type)||!ids.length)return NextResponse.json({error:"Invalid event."},{status:400});await db.query({text:`INSERT INTO matcher_events(visitor_id,property_id,event_type) SELECT $1,id,$2 FROM properties WHERE id=ANY($3::uuid[])`,values:[visitorId,type,ids]});return NextResponse.json({success:true})}catch{return NextResponse.json({error:"Could not record event."},{status:500})}}

