import{NextRequest,NextResponse}from"next/server";import{requireRole}from"@/lib/auth/requireRole";import{db}from"@/lib/supabase/server";
export async function POST(r:NextRequest,{params}:{params:Promise<{id:string}>}){if(!await requireRole(["admin"]))return NextResponse.json({error:"Only an administrator can merge listings."},{status:403});const{id:sourceId}=await params,b=await r.json(),targetId=String(b.targetId||"");if(!targetId||targetId===sourceId)return NextResponse.json({error:"Choose a different canonical listing."},{status:400});const target=await db.query({text:`SELECT id FROM properties WHERE id=$1::uuid`,values:[targetId]});if(!target.rows[0])return NextResponse.json({error:"Canonical listing not found."},{status:404});await db.query({text:`
UPDATE property_images SET property_id=$2::uuid WHERE property_id=$1::uuid;
UPDATE property_videos SET property_id=$2::uuid WHERE property_id=$1::uuid;
UPDATE property_features SET property_id=$2::uuid WHERE property_id=$1::uuid;
UPDATE property_views SET property_id=$2::uuid WHERE property_id=$1::uuid;
UPDATE inquiries SET property_id=$2::uuid WHERE property_id=$1::uuid;
INSERT INTO favorites(user_id,property_id,created_at) SELECT user_id,$2::uuid,created_at FROM favorites WHERE property_id=$1::uuid ON CONFLICT DO NOTHING;
DELETE FROM favorites WHERE property_id=$1::uuid;
INSERT INTO property_places(property_id,place_id,relation,sort_order) SELECT $2::uuid,place_id,relation,sort_order FROM property_places WHERE property_id=$1::uuid ON CONFLICT DO NOTHING;
DELETE FROM property_places WHERE property_id=$1::uuid;
UPDATE properties SET status='inactive',availability='inactive',archived_at=now(),archive_reason='Merged duplicate',merged_into_id=$2::uuid,updated_at=now() WHERE id=$1::uuid;
WITH ranked AS(SELECT id,row_number()OVER(ORDER BY is_cover DESC,sort_order,id) rn FROM property_images WHERE property_id=$2::uuid) UPDATE property_images pi SET sort_order=r.rn-1,is_cover=r.rn=1 FROM ranked r WHERE pi.id=r.id`,values:[sourceId,targetId]});return NextResponse.json({success:true,sourceId,targetId})}
