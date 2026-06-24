export const dynamic = 'force-dynamic';

import {NextRequest,NextResponse} from "next/server";
import {combinedFilterSearchQuery} from "@/lib/postgis/queries";
import {db} from "@/lib/supabase/server";
import type {MatcherInput,MatchedProperty} from "@/types/property";

type Center={name:string;barangay:string|null;slug:string;lat:number|null;lng:number|null};
type Amenity={id:string;schoolDistance:number|null;mallDistance:number|null;hospitalDistance:number|null};
const clean=(v:string|null|undefined)=>(v||"").toLowerCase().replace(/[^a-z0-9]+/g,"");

export async function POST(req:NextRequest){
 try{
  const input=await req.json() as MatcherInput;
  if(!input.budget||!input.familySize)return NextResponse.json({error:"Budget and family size are required."},{status:400});
  const minBedrooms=Math.ceil(input.familySize/2);
  const {rows}=await db.query(combinedFilterSearchQuery({minPrice:input.budget*.7,maxPrice:input.budget*1.3,minBedrooms,pageSize:50}));
  const available=(rows as MatchedProperty[]).filter(p=>p.availability==="available"&&p.status==="active");
  const {rows:centers}=await db.query<Center>({text:`SELECT name,barangay,slug,ST_Y(centroid::geometry) AS lat,ST_X(centroid::geometry) AS lng FROM neighborhoods`,values:[]});
  const wanted=input.preferredAreas.map(clean);
  const selectedCenters=centers.filter(c=>wanted.some(a=>[c.name,c.barangay,c.slug].some(v=>clean(v)===a))).filter(c=>c.lat!=null&&c.lng!=null);
  const ids=available.map(p=>p.id);
  const {rows:amenities}=ids.length?await db.query<Amenity>({text:`SELECT p.id,(SELECT min(ST_Distance(p.location,s.location)) FROM schools s)::float AS "schoolDistance",(SELECT min(ST_Distance(p.location,m.location)) FROM malls m)::float AS "mallDistance",(SELECT min(ST_Distance(p.location,h.location)) FROM hospitals h)::float AS "hospitalDistance" FROM properties p WHERE p.id=ANY($1::uuid[])`,values:[ids]}):{rows:[] as Amenity[]};
  const amenityById=new Map(amenities.map(a=>[a.id,a]));
  const ranked=available.map(p=>scoreProperty(p,input,minBedrooms,wanted,selectedCenters,amenityById.get(p.id))).sort((a,b)=>b.matchScore-a.matchScore||a.distanceKm-b.distanceKm).slice(0,24);
  return NextResponse.json({results:ranked,weights:{location:50,budget:25,bedrooms:10,lifestyle:15}});
 }catch(error){console.error("Matcher failed",error);return NextResponse.json({error:"Could not calculate matches."},{status:500})}
}

function scoreProperty(p:MatchedProperty,input:MatcherInput,minBedrooms:number,wanted:string[],centers:Center[],amenity?:Amenity){
 const primary=clean(`${p.primaryPlace||p.neighborhoodName} ${p.barangay||""}`);
 const exact=Boolean(wanted.length&&wanted.some(a=>primary===a||primary.includes(a)||a.includes(primary)));
 const nearbyTag=Boolean(!exact&&wanted.length&&(p.nearbyPlaces||[]).some(place=>wanted.some(a=>clean(place)===a)));
 const distanceKm=exact?0:centers.length?Math.min(...centers.map(c=>haversine(p.lat,p.lng,Number(c.lat),Number(c.lng)))):Infinity;
 let locationPoints=wanted.length?(exact?50:distanceKm<=3?42:distanceKm<=5?30:nearbyTag?22:0):50;
 const budgetGap=Math.abs(p.price-input.budget)/input.budget;
 const budgetPoints=Math.max(0,25*(1-budgetGap/.3));
 const bedroomPoints=Math.min(10,10*((p.bedrooms||0)/minBedrooms));
 const checks=input.lifestyle.map(tag=>tag==="near_schools"?(amenity?.schoolDistance??Infinity)<=3000:tag==="near_malls"?(amenity?.mallDistance??Infinity)<=3000:tag==="near_hospitals"?(amenity?.hospitalDistance??Infinity)<=3000:tag==="financing"?p.financingAvailable:tag==="parking"?(p.parkingSpaces||0)>0:false);
 const lifestylePoints=checks.length?15*(checks.filter(Boolean).length/checks.length):15;
 const score=Math.round(Math.min(100,locationPoints+budgetPoints+bedroomPoints+lifestylePoints));
 const locationReason=!wanted.length?"no preferred location selected":exact?"inside your chosen area":Number.isFinite(distanceKm)&&distanceKm<=5?`${distanceKm.toFixed(1)} km from your chosen area`:nearbyTag?"tagged near your chosen area (exact pin weighted more strongly)":`outside your preferred area${Number.isFinite(distanceKm)?` (${distanceKm.toFixed(1)} km away)`:""}`;
 const reasons=[locationReason,`${Math.round(budgetGap*100)}% from your budget`,p.bedrooms==null?"bedrooms not provided":`${p.bedrooms} bedrooms for a household of ${input.familySize}`];
 if(input.lifestyle.length)reasons.push(`${checks.filter(Boolean).length} of ${checks.length} selected priorities met`);
 return{...p,matchScore:score,distanceKm:Number.isFinite(distanceKm)?Math.round(distanceKm*10)/10:0,outsidePreferredArea:Boolean(wanted.length&&!exact&&!nearbyTag&&distanceKm>5),matchReason:`${reasons.join(" · ")}.`};
}
function haversine(aLat:number,aLng:number,bLat:number,bLng:number){const r=6371,toRad=(n:number)=>n*Math.PI/180,dLat=toRad(bLat-aLat),dLng=toRad(bLng-aLng);const a=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;return 2*r*Math.asin(Math.sqrt(a))}

