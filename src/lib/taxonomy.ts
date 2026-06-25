import { db } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import type { Role } from "@/lib/auth/requireRole";

export function normalizeTaxonomyName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function resolveDeveloper(name: unknown, actor: { userId: string; role: Role }) {
  const clean = String(name ?? "").trim();
  if (!clean) return null;
  const normalized = normalizeTaxonomyName(clean);
  const existing = await db.query<{id:string}>({
    text:`SELECT d.id FROM developers d LEFT JOIN developer_aliases da ON da.developer_id=d.id
      WHERE lower(d.name)=lower($1) OR da.normalized_alias=$2 LIMIT 1`, values:[clean, normalized]
  });
  if (existing.rows[0]) return existing.rows[0].id;
  const approved = actor.role === "admin";
  const inserted = await db.query<{id:string}>({
    text:`INSERT INTO developers(name,slug,is_active,approval_status,suggested_by,updated_at)
      VALUES($1,$2,$3,$4,$5::uuid,now()) RETURNING id`,
    values:[clean, `${slugify(clean)}-${Date.now().toString(36)}`, approved, approved ? "approved" : "pending", actor.userId]
  });
  return inserted.rows[0].id;
}

async function resolvePlace(name: string, actor: { userId: string; role: Role }, kind: string) {
  const clean=name.trim(); if(!clean) return null;
  const normalized=normalizeTaxonomyName(clean);
  const found=await db.query<{id:string}>({text:`SELECT p.id FROM places p LEFT JOIN place_aliases pa ON pa.place_id=p.id
    WHERE p.normalized_name=$1 OR pa.normalized_alias=$1 LIMIT 1`,values:[normalized]});
  if(found.rows[0]) return found.rows[0].id;
  const status=actor.role==="admin"?"active":"pending";
  const created=await db.query<{id:string}>({text:`INSERT INTO places(name,normalized_name,slug,kind,status,created_by)
    VALUES($1,$2,$3,$4,$5,$6::uuid) RETURNING id`,values:[clean,normalized,`${slugify(clean)}-${Date.now().toString(36)}`,kind,status,actor.userId]});
  return created.rows[0].id;
}

export async function syncPropertyPlaces(propertyId:string, primary:unknown, nearby:unknown, actor:{userId:string;role:Role}){
  const primaryName=String(primary??"").trim();
  const nearbyNames=Array.isArray(nearby)?nearby.map(String):String(nearby??"").split(/[;,]/);
  const unique=[...new Set(nearbyNames.map(x=>x.trim()).filter(x=>x && normalizeTaxonomyName(x)!==normalizeTaxonomyName(primaryName)))].slice(0,8);
  const primaryId=primaryName?await resolvePlace(primaryName,actor,"neighborhood"):null;
  const nearbyIds=(await Promise.all(unique.map(x=>resolvePlace(x,actor,"landmark")))).filter(Boolean) as string[];
  await db.query({text:`DELETE FROM property_places WHERE property_id=$1::uuid`,values:[propertyId]});
  if(primaryId) await db.query({text:`INSERT INTO property_places(property_id,place_id,relation,sort_order) VALUES($1::uuid,$2::uuid,'primary',0)`,values:[propertyId,primaryId]});
  for(let i=0;i<nearbyIds.length;i++) await db.query({text:`INSERT INTO property_places(property_id,place_id,relation,sort_order) VALUES($1::uuid,$2::uuid,'nearby',$3) ON CONFLICT DO NOTHING`,values:[propertyId,nearbyIds[i],i]});
}

export async function findDuplicateListings(input:{title:string;address:string;price:number;lat:number;lng:number},excludeId?:string){
  const {rows}=await db.query({text:`SELECT id,title,address,price::float AS price,slug,
    round(ST_Distance(location,ST_MakePoint($4,$5)::geography))::int AS "distanceMeters"
    FROM properties WHERE (NULLIF($6,'')::uuid IS NULL OR id<>NULLIF($6,'')::uuid) AND merged_into_id IS NULL AND status<>'inactive'
      AND ((similarity(lower(title),lower($1))>=.58 AND price BETWEEN $3*.8 AND $3*1.2)
        OR (similarity(lower(coalesce(address,'')),lower($2))>=.62)
        OR (ST_DWithin(location,ST_MakePoint($4,$5)::geography,75) AND price BETWEEN $3*.8 AND $3*1.2))
    ORDER BY GREATEST(similarity(lower(title),lower($1)),similarity(lower(coalesce(address,'')),lower($2))) DESC LIMIT 5`,
    values:[input.title,input.address,input.price,input.lng,input.lat,excludeId??'']});
  return rows;
}
