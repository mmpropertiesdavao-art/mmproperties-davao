"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationPicker } from "@/components/map/LocationPicker";
import { DeveloperField } from "@/components/admin/DeveloperField";
import { PlaceFields } from "@/components/admin/PlaceFields";

const PROPERTY_TYPES = [
  { slug: "house-and-lot", label: "House and Lot" },
  { slug: "condominium", label: "Condominium" },
  { slug: "lot-only", label: "Lot Only" },
  { slug: "commercial", label: "Commercial Property" },
  { slug: "townhouse", label: "Townhouse" },
  { slug: "foreclosed", label: "Foreclosed Property" },
];

const inputClass =
  "w-full rounded-md border border-navy-200 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500";
const labelClass = "mb-1 block text-sm font-medium text-navy-800";

async function readJson(response: Response) {
  return response.json().catch(() => ({
    error: response.ok
      ? "The server returned an empty response."
      : "Your session may have expired or the server returned a non-JSON error.",
  }));
}

export default function NewListingPage() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [primaryPlace,setPrimaryPlace]=useState("");
  const [nearbyPlaces,setNearbyPlaces]=useState<string[]>([]);

  const previews = useMemo(
    () =>
      photos.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [photos],
  );

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files);
    const invalid = incoming.find((file) => !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) {
      setResult({ ok: false, message: `${invalid.name} must be a JPG, PNG, WebP, or AVIF file under 8 MB.` });
      return;
    }
    setPhotos((current) => {
      const known = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...incoming.filter((file) => !known.has(`${file.name}-${file.size}-${file.lastModified}`))].slice(0, 12);
    });
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function uploadPhotos(propertyId: string) {
    if (photos.length === 0) return true;

    const formData = new FormData();
    formData.append("propertyId", propertyId);
    photos.forEach((file) => formData.append("files", file));

    const uploadResponse = await fetch("/api/admin/photos/upload", {
      method: "POST",
      body: formData,
    });

    return uploadResponse.ok;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
        title: form.get("title"),
        description: form.get("description"),
        propertyTypeSlug: form.get("propertyTypeSlug"),
        developerName: form.get("developerName") || undefined,
        price: Number(form.get("price")),
        monthlyAmortization: form.get("monthlyAmortization") ? Number(form.get("monthlyAmortization")) : undefined,
        downpaymentPercent: form.get("downpaymentPercent") ? Number(form.get("downpaymentPercent")) : undefined,
        bedrooms: form.get("bedrooms") ? Number(form.get("bedrooms")) : undefined,
        bathrooms: form.get("bathrooms") ? Number(form.get("bathrooms")) : undefined,
        floorAreaSqm: form.get("floorAreaSqm") ? Number(form.get("floorAreaSqm")) : undefined,
        lotAreaSqm: form.get("lotAreaSqm") ? Number(form.get("lotAreaSqm")) : undefined,
        parkingSpaces: form.get("parkingSpaces") ? Number(form.get("parkingSpaces")) : undefined,
        primaryPlace,nearbyPlaces,
        barangay: form.get("barangay") || undefined,
        address: form.get("address"), lat: pin?.lat, lng: pin?.lng,
        isForeclosed: form.get("isForeclosed") === "on", isFeatured: form.get("isFeatured") === "on",
        listingIntent: form.get("listingIntent"), availability: form.get("availability"),
        rentPrice: form.get("rentPrice") ? Number(form.get("rentPrice")) : undefined,
        financingAvailable: form.get("financingAvailable") === "on", assumeBalanceAvailable: form.get("assumeBalanceAvailable") === "on",
      };
    let response = await fetch("/api/admin/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = await readJson(response);
    if(response.status===409&&data.requiresConfirmation&&window.confirm(`${data.error}\n\n${data.duplicates.map((d:{title:string;address:string})=>`• ${d.title} — ${d.address}`).join("\n")}\n\nCreate it anyway?`)){response=await fetch("/api/admin/properties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,allowDuplicate:true})});data=await readJson(response)}
    if (!response.ok) {
      setResult({ ok: false, message: data.error ?? "Something went wrong." });
      setSubmitting(false);
      return;
    }

    const photosSaved = await uploadPhotos(data.id);
    setResult({
      ok: photosSaved,
      message: photosSaved
        ? "Listing created with photos."
        : "Listing created, but the photos did not finish uploading. You can add them from Manage Photos.",
    });

    if (photosSaved) {
      event.currentTarget.reset();
      setPhotos([]);
      setPin(null);
      setPrimaryPlace("");setNearbyPlaces([]);
    }

    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-navy-900">Add a new listing</h1>
      <p className="mt-1 text-sm text-navy-400">
        Add the listing details, pin the exact location, then upload the photos in the order you want buyers to see them.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <section className="space-y-5">
          <div>
            <label className={labelClass}>Listing title</label>
            <input name="title" required placeholder="e.g. 3BR House and Lot in Lanang" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" rows={4} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Property type</label>
              <select name="propertyTypeSlug" required className={inputClass}>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Developer</label>
              <DeveloperField className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Price (PHP)</label>
              <input name="price" type="number" required min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Monthly amortization (PHP)</label>
              <input name="monthlyAmortization" type="number" min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Downpayment %</label>
              <input name="downpaymentPercent" type="number" min={0} max={100} className={inputClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Listing offer</label>
              <select name="listingIntent" className={inputClass} defaultValue="sale">
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
                <option value="sale_or_rent">For sale or rent</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Availability</label>
              <select name="availability" className={inputClass} defaultValue="available">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="rented">Rented</option>
                <option value="sold">Sold</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Monthly rent (PHP)</label>
              <input name="rentPrice" type="number" min={0} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input name="bedrooms" type="number" min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input name="bathrooms" type="number" min={0} step={0.5} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Floor area (sqm)</label>
              <input name="floorAreaSqm" type="number" min={0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lot area (sqm)</label>
              <input name="lotAreaSqm" type="number" min={0} className={inputClass} />
            </div>
            <div><label className={labelClass}>Parking / carport</label><input name="parkingSpaces" type="number" min={0} className={inputClass}/></div>
          </div>
        </section>

        <section className="space-y-4">
          <PlaceFields primary={primaryPlace} onPrimaryChange={setPrimaryPlace} nearby={nearbyPlaces} onNearbyChange={setNearbyPlaces} className={inputClass}/>
          <div className="grid grid-cols-2 gap-4"><div>
              <label className={labelClass}>Barangay</label>
              <input name="barangay" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address or nearby landmark</label>
            <input name="address" required placeholder="e.g. Green Meadows, Brgy. Sto. Nino, Davao City" className={inputClass} />
            <p className="mt-1 text-xs text-navy-400">Use the map pin below for the exact location buyers should see.</p>
          </div>

          <div>
            <label className={labelClass}>Exact map pin</label>
            <LocationPicker value={pin} onChange={setPin} />
            <p className="mt-2 text-xs text-navy-500">
              {pin ? `Pinned at ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}` : "Click the map or drag the marker to set the exact location."}
            </p>
          </div>
        </section>

        <section>
          <label className={labelClass}>Photos</label>
          <div className="rounded-lg border-2 border-dashed border-navy-200 bg-white p-5">
            <input type="file" accept="image/*" multiple onChange={(event) => addPhotos(event.target.files)} className="block w-full text-sm" />
            <p className="mt-2 text-xs text-navy-400">Up to 12 JPG, PNG, WebP, or AVIF photos, 8 MB each. The first photo is the cover.</p>
          </div>

          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {previews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="overflow-hidden rounded-lg border border-navy-100 bg-white">
                  <img src={preview.url} alt={preview.file.name} className="h-36 w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <p className="truncate text-xs text-navy-600">{index === 0 ? "Cover: " : ""}{preview.file.name}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                        Up
                      </button>
                      <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === previews.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
                        Down
                      </button>
                      <button type="button" onClick={() => removePhoto(index)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="financingAvailable" /> Financing available
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="assumeBalanceAvailable" /> Assume balance
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isForeclosed" /> Foreclosed property
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isFeatured" /> Feature on homepage
          </label>
        </div>

        {result && (
          <p className={`rounded-md p-3 text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
            {result.message}
          </p>
        )}

        <button type="submit" disabled={submitting} className="rounded-md bg-gold-500 px-6 py-3 font-medium text-navy-900 hover:bg-gold-300 disabled:opacity-50">
          {submitting ? "Saving listing..." : "Publish listing"}
        </button>
      </form>
    </div>
  );
}
