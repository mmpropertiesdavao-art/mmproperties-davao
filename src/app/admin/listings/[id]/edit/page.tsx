"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LocationPicker } from "@/components/map/LocationPicker";
import { VideoManager } from "@/components/property/VideoManager";
import { DeveloperField } from "@/components/admin/DeveloperField";
import { PlaceFields } from "@/components/admin/PlaceFields";
import { ListingStatusActions } from "@/components/admin/ListingStatusActions";

interface EditableListing {
  id: string; slug: string; title: string; description: string | null;
  propertyTypeSlug: string; developerName: string | null; price: number;
  monthlyAmortization: number | null; downpaymentPercent: number | null;
  bedrooms: number | null; bathrooms: number | null; floorAreaSqm: number | null;
  lotAreaSqm: number | null; neighborhoodSlug: string | null; barangay: string | null;
  address: string; lat: number; lng: number; status: string;
  isForeclosed: boolean; isFeatured: boolean;
  listingIntent: "sale" | "rent" | "sale_or_rent"; availability: string;
  rentPrice: number | null; financingAvailable: boolean; assumeBalanceAvailable: boolean;
  parkingSpaces: number | null;
  primaryPlace:string|null; nearbyPlaces:string[]; photoCount:number;viewCount:number;saveCount:number;inquiryCount:number;
}

const PROPERTY_TYPES = [
  ["house-and-lot", "House and Lot"], ["condominium", "Condominium"],
  ["lot-only", "Lot Only"], ["commercial", "Commercial Property"],
  ["townhouse", "Townhouse"], ["foreclosed", "Foreclosed Property"],
];
const inputClass = "w-full rounded-md border border-navy-200 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500";
const labelClass = "mb-1 block text-sm font-medium text-navy-800";

async function readJson(response: Response) {
  return response.json().catch(() => ({
    error: response.ok
      ? "The server returned an empty response."
      : "Your session may have expired or the server returned a non-JSON error.",
  }));
}

export default function EditListingPage() {
  const id = String(useParams<{ id: string }>().id);
  const [listing, setListing] = useState<EditableListing | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [primaryPlace,setPrimaryPlace]=useState("");const[nearbyPlaces,setNearbyPlaces]=useState<string[]>([]);const[confirmation,setConfirmation]=useState("");
  const [mergeTarget,setMergeTarget]=useState("");const[candidates,setCandidates]=useState<{id:string;title:string;address:string}[]>([]);

  useEffect(() => {
    fetch(`/api/admin/properties/${id}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await readJson(response) }))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Could not load listing.");
        setListing(data); setPin({ lat: Number(data.lat), lng: Number(data.lng) });setPrimaryPlace(data.primaryPlace||"");setNearbyPlaces(data.nearbyPlaces||[]);
      })
      .catch((error) => setMessage({ ok: false, text: error.message }))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(()=>{fetch("/api/admin/properties/list",{cache:"no-store"}).then(r=>r.json()).then((v)=>setCandidates(Array.isArray(v)?v.filter((x:{id:string})=>x.id!==id):[])).catch(()=>{})},[id]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) return;
    setSaving(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const body={ ...payload, lat: pin.lat, lng: pin.lng, primaryPlace,nearbyPlaces,isForeclosed: form.get("isForeclosed") === "on", isFeatured: form.get("isFeatured") === "on", financingAvailable: form.get("financingAvailable") === "on", assumeBalanceAvailable: form.get("assumeBalanceAvailable") === "on" };
    let response = await fetch(`/api/admin/properties/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data = await readJson(response);
    if(response.status===409&&data.requiresConfirmation&&window.confirm(`${data.error}\n${data.duplicates.map((d:{title:string})=>`• ${d.title}`).join("\n")}\nSave anyway?`)){response=await fetch(`/api/admin/properties/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,allowDuplicate:true})});data=await readJson(response)}
    setMessage(response.ok ? { ok: true, text: "Listing changes saved." } : { ok: false, text: data.error ?? "Could not save changes." });
    setSaving(false);
  }

  if (loading) return <div className="mx-auto max-w-4xl px-6 py-12 text-navy-500">Loading listing...</div>;
  if (!listing) return <div className="mx-auto max-w-4xl px-6 py-12">{message?.text ?? "Listing not found."}</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-navy-900">Edit listing</h1><p className="mt-1 text-sm text-navy-400">The public URL stays unchanged when the title is edited.</p></div><div className="flex gap-3"><Link href={`/admin/photos?propertyId=${id}`} className="rounded-md border border-navy-200 px-3 py-2 text-sm">Manage photos</Link><Link href={`/property/${listing.slug}`} className="rounded-md border border-gold-400 px-3 py-2 text-sm">View public page</Link></div></div>
      <div className="mt-6">
        <ListingStatusActions
          propertyId={id}
          status={listing.status}
          availability={listing.availability}
          onChange={(next) => setListing((current) => current ? { ...current, ...next } : current)}
        />
      </div>
      <form onSubmit={save} className="mt-7 space-y-6">
        <div><label className={labelClass}>Listing title</label><input name="title" required defaultValue={listing.title} className={inputClass} /></div>
        <div><label className={labelClass}>Description</label><textarea name="description" rows={6} defaultValue={listing.description ?? ""} className={inputClass} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className={labelClass}>Property type</label><select name="propertyTypeSlug" defaultValue={listing.propertyTypeSlug} className={inputClass}>{PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label className={labelClass}>Status</label><select name="status" defaultValue={listing.status} className={inputClass}><option value="active">Active</option><option value="pending">Pending</option><option value="sold">Sold</option><option value="inactive">Inactive</option></select></div>
          <div><label className={labelClass}>Developer</label><DeveloperField defaultValue={listing.developerName ?? ""} className={inputClass} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3"><div><label className={labelClass}>Listing offer</label><select name="listingIntent" defaultValue={listing.listingIntent} className={inputClass}><option value="sale">For sale</option><option value="rent">For rent</option><option value="sale_or_rent">Sale or rent</option></select></div><div><label className={labelClass}>Availability</label><select name="availability" defaultValue={listing.availability} className={inputClass}><option value="available">Available</option><option value="reserved">Reserved</option><option value="rented">Rented</option><option value="sold">Sold</option><option value="inactive">Inactive</option></select></div><NumberField name="rentPrice" label="Monthly rent (PHP)" value={listing.rentPrice} /></div>
        <div className="grid gap-4 sm:grid-cols-3"><NumberField name="price" label="Price (PHP)" value={listing.price} required /><NumberField name="monthlyAmortization" label="Monthly amortization" value={listing.monthlyAmortization} /><NumberField name="downpaymentPercent" label="Downpayment %" value={listing.downpaymentPercent} /></div>
        <div className="grid gap-4 sm:grid-cols-5"><NumberField name="bedrooms" label="Bedrooms" value={listing.bedrooms} /><NumberField name="bathrooms" label="Bathrooms" value={listing.bathrooms} step="0.5" /><NumberField name="floorAreaSqm" label="Floor area (sqm)" value={listing.floorAreaSqm} /><NumberField name="lotAreaSqm" label="Lot area (sqm)" value={listing.lotAreaSqm} /><NumberField name="parkingSpaces" label="Parking / carport" value={listing.parkingSpaces}/></div>
        <PlaceFields primary={primaryPlace} onPrimaryChange={setPrimaryPlace} nearby={nearbyPlaces} onNearbyChange={setNearbyPlaces} className={inputClass}/>
        <div><label className={labelClass}>Barangay</label><input name="barangay" defaultValue={listing.barangay ?? ""} className={inputClass} /></div>
        <div><label className={labelClass}>Address</label><input name="address" required defaultValue={listing.address} className={inputClass} /></div>
        <div><label className={labelClass}>Exact map pin</label><LocationPicker value={pin} onChange={setPin} /></div>
        <div className="flex flex-wrap gap-6 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="financingAvailable" defaultChecked={listing.financingAvailable} /> Financing available</label><label className="flex items-center gap-2"><input type="checkbox" name="assumeBalanceAvailable" defaultChecked={listing.assumeBalanceAvailable} /> Assume balance</label><label className="flex items-center gap-2"><input type="checkbox" name="isForeclosed" defaultChecked={listing.isForeclosed} /> Foreclosed</label><label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={listing.isFeatured} /> Featured</label></div>
        {message && <p className={`rounded-md p-3 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
        <button disabled={saving} className="rounded-md bg-gold-500 px-6 py-3 font-semibold text-navy-900 disabled:opacity-50">{saving ? "Saving..." : "Save listing changes"}</button>
      </form>
      <div className="mt-8"><VideoManager propertyId={id} /></div>
      <section className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5"><h2 className="text-lg font-semibold text-red-900">Listing safety</h2><p className="mt-1 text-sm text-red-800">This listing has {listing.photoCount} photos, {listing.viewCount} views, {listing.saveCount} saves and {listing.inquiryCount} inquiries. Archive is reversible and recommended.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={async()=>{if(!confirm("Archive this listing? It will disappear from public search."))return;const r=await fetch(`/api/admin/properties/${id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"archive"})});setMessage(r.ok?{ok:true,text:"Listing archived."}:{ok:false,text:"Could not archive listing."})}} className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm text-red-800">Archive listing</button></div><div className="mt-5 border-t border-red-200 pt-4"><label className={labelClass}>Merge duplicate into canonical listing (admin only)</label><div className="flex gap-2"><select value={mergeTarget} onChange={e=>setMergeTarget(e.target.value)} className={inputClass}><option value="">Choose the listing to keep</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.title} — {x.address}</option>)}</select><button type="button" disabled={!mergeTarget} onClick={async()=>{if(!confirm("Move photos, places, views, saves and inquiries into the selected listing, then archive this duplicate?"))return;const r=await fetch(`/api/admin/properties/${id}/merge`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetId:mergeTarget})});const d=await r.json();setMessage(r.ok?{ok:true,text:"Duplicate merged and archived."}:{ok:false,text:d.error||"Merge failed."})}} className="whitespace-nowrap rounded-md border border-red-300 bg-white px-4 py-2 text-sm disabled:opacity-40">Merge duplicate</button></div></div><div className="mt-5 border-t border-red-200 pt-4"><label className={labelClass}>Permanent deletion (admin only): type “{listing.title}”</label><div className="flex gap-2"><input value={confirmation} onChange={e=>setConfirmation(e.target.value)} className={inputClass}/><button type="button" disabled={confirmation!==listing.title} onClick={async()=>{const r=await fetch(`/api/admin/properties/${id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"permanent",confirmation})});const d=await r.json();setMessage(r.ok?{ok:true,text:"Listing permanently deleted."}:{ok:false,text:d.error||"Delete failed."})}} className="whitespace-nowrap rounded-md bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-40">Delete permanently</button></div></div></section>
    </div>
  );
}

function NumberField({ name, label, value, required, step = "1" }: { name: string; label: string; value: number | null; required?: boolean; step?: string }) {
  return <div><label className={labelClass}>{label}</label><input name={name} type="number" min="0" step={step} required={required} defaultValue={value ?? ""} className={inputClass} /></div>;
}
