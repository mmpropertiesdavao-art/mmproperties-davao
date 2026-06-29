"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LocationPicker } from "@/components/map/LocationPicker";

type Model = {
  id: string;
  modelType?: "house_model" | "lot_only";
  name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floorArea: number | null;
  lotArea: number | null;
  parkingSlots: number | null;
  currentPrice: number | null;
  description: string | null;
  floorPlanImage: string | null;
  gallery: string[];
  active: boolean;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
};

type Project = {
  id: string;
  projectName: string;
  slug: string;
  address: string | null;
  barangay: string | null;
  city: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  gallery: string[];
  description: string | null;
  amenities: string[];
  status: string;
  heroImage: string | null;
  active: boolean;
  modelCount: number;
  availableUnits: number;
  models: Model[];
};

type Developer = {
  id: string;
  modelType?: "house_model" | "lot_only";
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  contactNumber: string | null;
  email: string | null;
  isActive: boolean;
  projects: Project[];
};

const input = "w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500";

function formatPeso(value: number | null | undefined) {
  if (!value) return "Price not set";
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({ error: "The server returned an invalid response." }));
}

export default function DeveloperInventoryAdminPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const projects = useMemo(
    () => developers.flatMap((developer) => developer.projects.map((project) => ({ ...project, developerName: developer.name }))),
    [developers],
  );

  async function load() {
    const response = await fetch("/api/admin/developer-inventory", { cache: "no-store" });
    const data = await readJson(response);
    if (response.ok) setDevelopers(Array.isArray(data) ? data : []);
    else setMessage(data.error || "Could not load developer inventory.");
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(type: string, form: HTMLFormElement, extra: Record<string, unknown> = {}) {
    setSaving(true);
    setMessage(null);
    const payload = { type, ...Object.fromEntries(new FormData(form).entries()), ...extra };
    const response = await fetch("/api/admin/developer-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error || "Could not save.");
      return;
    }
    form.reset();
    setMessage("Saved.");
    await load();
  }

  async function updateModel(model: Model, form: HTMLFormElement) {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/developer-inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "model", id: model.id, ...Object.fromEntries(new FormData(form).entries()) }),
    });
    const data = await readJson(response);
    setSaving(false);
    setMessage(response.ok ? "Model updated. Price history was recorded if price changed." : data.error || "Could not update model.");
    if (response.ok) await load();
  }

  async function upload(files: FileList | null, target: HTMLInputElement | HTMLTextAreaElement, folder: string) {
    if (!files?.length) return;
    setMessage("Uploading image...");
    const form = new FormData();
    form.set("folder", folder);
    Array.from(files).forEach((file) => form.append("files", file));
    const response = await fetch("/api/admin/developer-inventory/upload", { method: "POST", body: form });
    const data = await readJson(response);
    if (!response.ok) {
      setMessage(data.error || "Upload failed.");
      return;
    }
    const current = target.value.trim();
    target.value = [current, ...(data.urls || [])].filter(Boolean).join("\n");
    setMessage("Image uploaded. Save the form to keep it.");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-gold-700">New Developments</p>
          <h1 className="text-3xl font-bold text-navy-950">Developer inventory</h1>
          <p className="mt-1 max-w-3xl text-sm text-navy-500">
            Manage developers, multiple project locations, house models, price history, and inventory counts without creating duplicate brokerage listings.
          </p>
        </div>
        <Link href="/search" className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800">
          View search
        </Link>
      </div>

      {message && <p className="mt-5 rounded-lg bg-navy-50 p-3 text-sm text-navy-700">{message}</p>}

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit("developer", event.currentTarget);
          }}
          className="rounded-2xl border bg-white p-5 shadow-sm"
        >
          <h2 className="font-bold text-navy-900">Add developer</h2>
          <div className="mt-4 space-y-3">
            <Field name="name" label="Developer name" required />
            <Field name="logoUrl" label="Logo URL" />
            <Field name="website" label="Website" />
            <Field name="contactNumber" label="Contact number" />
            <Field name="email" label="Email" />
            <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
            <button disabled={saving} className="min-h-11 w-full rounded-lg bg-gold-500 px-4 py-2 font-bold text-navy-950 disabled:opacity-50">Add developer</button>
          </div>
        </form>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit("project", event.currentTarget, { developerId: selectedDeveloperId });
          }}
          className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"
        >
          <h2 className="font-bold text-navy-900">Add project location</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><span className={label}>Developer</span><select required value={selectedDeveloperId} onChange={(e) => setSelectedDeveloperId(e.target.value)} className={input}><option value="">Choose developer</option>{developers.map((developer) => <option key={developer.id} value={developer.id}>{developer.name}</option>)}</select></div>
            <Field name="projectName" label="Project name" required />
            <Field name="barangay" label="Barangay" />
            <Field name="address" label="Address" />
            <Field name="city" label="City" defaultValue="Davao City" />
            <Field name="province" label="Province" defaultValue="Davao del Sur" />
            <Field name="latitude" label="Latitude" type="number" step="any" />
            <Field name="longitude" label="Longitude" type="number" step="any" />
            <div><span className={label}>Project status</span><select name="status" className={input} defaultValue="pre_selling"><option value="pre_selling">Pre-selling</option><option value="under_construction">Under Construction</option><option value="ready_for_occupancy">Ready for Occupancy</option><option value="completed">Completed</option><option value="inactive">Inactive</option></select></div>
            <Field name="completionDate" label="Completion date" type="date" />
            <TextArea name="amenities" label="Amenities (comma or one per line)" />
            <UploadTextArea name="gallery" label="Gallery URLs" onUpload={(files, target) => upload(files, target, "project-gallery")} />
            <UploadInput name="heroImage" label="Hero image" onUpload={(files, target) => upload(files, target, "project-hero")} />
            <TextArea name="description" label="Project description" className="md:col-span-2" />
            <Field name="seoTitle" label="SEO title" />
            <Field name="seoDescription" label="SEO description" />
            <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
            <button disabled={saving || !selectedDeveloperId} className="min-h-11 rounded-lg bg-navy-900 px-4 py-2 font-bold text-white disabled:opacity-50">Add project</button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-navy-900">Add house model</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit("model", event.currentTarget, { projectId: selectedProjectId });
          }}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <div className="md:col-span-2"><span className={label}>Project</span><select required value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={input}><option value="">Choose project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.developerName} — {project.projectName}</option>)}</select></div>
          <div><span className={label}>Inventory type</span><select name="modelType" className={input} defaultValue="house_model"><option value="house_model">House model</option><option value="lot_only">Lot only</option></select></div>
          <Field name="name" label="Model / lot name" required />
          <Field name="currentPrice" label="Current price" type="number" />
          <Field name="bedrooms" label="Bedrooms" type="number" />
          <Field name="bathrooms" label="Bathrooms" type="number" step="0.5" />
          <Field name="floorArea" label="Floor area" type="number" />
          <Field name="lotArea" label="Lot area" type="number" />
          <Field name="parkingSlots" label="Parking" type="number" />
          <Field name="availableUnits" label="Available" type="number" />
          <Field name="reservedUnits" label="Reserved" type="number" />
          <Field name="soldUnits" label="Sold" type="number" />
          <UploadInput name="floorPlanImage" label="Floor plan" onUpload={(files, target) => upload(files, target, "model-floor-plan")} />
          <UploadTextArea name="gallery" label="Model gallery URLs" onUpload={(files, target) => upload(files, target, "model-gallery")} />
          <TextArea name="description" label="Model description" className="md:col-span-2" />
          <button disabled={saving || !selectedProjectId} className="min-h-11 rounded-lg bg-gold-500 px-4 py-2 font-bold text-navy-950 disabled:opacity-50 md:col-span-4">Add model</button>
        </form>
      </section>

      <section className="mt-8 space-y-5">
        {developers.map((developer) => (
          <article key={developer.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {developer.logoUrl && <img src={developer.logoUrl} alt="" className="h-12 w-12 rounded-full border object-cover" />}
                <div>
                  <h2 className="text-xl font-bold text-navy-950">{developer.name}</h2>
                  <p className="text-sm text-navy-500">{developer.projects.length} project location{developer.projects.length === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {developer.projects.map((project) => (
                <div key={project.id} className="rounded-xl border border-navy-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-gold-700">{project.status.replace(/_/g, " ")}</p>
                      <h3 className="font-bold text-navy-900">{project.projectName}</h3>
                      <p className="text-sm text-navy-500">{[project.barangay, project.city].filter(Boolean).join(", ")}</p>
                    </div>
                    <Link href={`/projects/${project.slug}`} className="rounded-lg border border-navy-200 px-3 py-2 text-sm font-semibold">Public page</Link>
                  </div>
                  <ProjectEditor project={project} saving={saving} upload={upload} onSaved={load} setMessage={setMessage} />

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {project.models.map((model) => (
                      <form key={model.id} onSubmit={(event) => { event.preventDefault(); void updateModel(model, event.currentTarget); }} className="rounded-xl bg-navy-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {(model.gallery?.[0] || model.floorPlanImage) && (
                              <div className="image-zoom-frame mb-3 h-20 w-28 overflow-hidden rounded-lg border bg-white">
                                <img src={model.gallery?.[0] || model.floorPlanImage || ""} alt="" className="zoomable-image h-full w-full object-cover" />
                              </div>
                            )}
                            <h4 className="font-bold text-navy-900">{model.name}</h4>
                            <p className="text-sm text-navy-500">{formatPeso(model.currentPrice)} · {model.availableUnits} available</p>
                          </div>
                          <label className="text-xs"><input name="active" type="checkbox" defaultChecked={model.active} /> Active</label>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <input name="name" defaultValue={model.name} className={input} aria-label="Model name" />
                          <select name="modelType" defaultValue={model.modelType || "house_model"} className={input} aria-label="Inventory type"><option value="house_model">House model</option><option value="lot_only">Lot only</option></select>
                          <input name="currentPrice" type="number" defaultValue={model.currentPrice ?? ""} className={input} aria-label="Current price" />
                          <input name="bedrooms" type="number" defaultValue={model.bedrooms ?? ""} className={input} aria-label="Bedrooms" />
                          <input name="bathrooms" type="number" step="0.5" defaultValue={model.bathrooms ?? ""} className={input} aria-label="Bathrooms" />
                          <input name="floorArea" type="number" defaultValue={model.floorArea ?? ""} className={input} aria-label="Floor area" />
                          <input name="lotArea" type="number" defaultValue={model.lotArea ?? ""} className={input} aria-label="Lot area" />
                          <input name="parkingSlots" type="number" defaultValue={model.parkingSlots ?? ""} className={input} aria-label="Parking" />
                          <input name="availableUnits" type="number" defaultValue={model.availableUnits ?? 0} className={input} aria-label="Available units" />
                          <input name="reservedUnits" type="number" defaultValue={model.reservedUnits ?? 0} className={input} aria-label="Reserved units" />
                          <input name="soldUnits" type="number" defaultValue={model.soldUnits ?? 0} className={input} aria-label="Sold units" />
                          <label className="sm:col-span-3">
                            <span className={label}>Floor plan</span>
                            <input name="floorPlanImage" defaultValue={model.floorPlanImage ?? ""} className={input} aria-label="Floor plan image" />
                            <input type="file" accept="image/*" onChange={(event) => {
                              const target = event.currentTarget.parentElement?.querySelector("input[name='floorPlanImage']");
                              if (target instanceof HTMLInputElement) void upload(event.currentTarget.files, target, "model-floor-plan");
                              event.currentTarget.value = "";
                            }} className="mt-2 w-full text-xs" />
                          </label>
                          <label className="sm:col-span-3">
                            <span className={label}>Gallery photos</span>
                            <textarea name="gallery" defaultValue={(model.gallery || []).join("\n")} className={input} rows={2} aria-label="Gallery URLs" />
                            <input type="file" accept="image/*" multiple onChange={(event) => {
                              const target = event.currentTarget.parentElement?.querySelector("textarea[name='gallery']");
                              if (target instanceof HTMLTextAreaElement) void upload(event.currentTarget.files, target, "model-gallery");
                              event.currentTarget.value = "";
                            }} className="mt-2 w-full text-xs" />
                          </label>
                          <textarea name="description" defaultValue={model.description ?? ""} className={`${input} sm:col-span-3`} rows={2} aria-label="Description" />
                        </div>
                        <button disabled={saving} className="mt-3 min-h-11 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save model / inventory</button>
                      </form>
                    ))}
                    {project.models.length === 0 && <p className="text-sm text-navy-500">No house models yet.</p>}
                  </div>
                </div>
              ))}
              {developer.projects.length === 0 && <p className="text-sm text-navy-500">No projects yet for this developer.</p>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label: text, className, ...rest } = props;
  return <label className={className}><span className={label}>{text}</span><input {...rest} className={input} /></label>;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label: text, className, ...rest } = props;
  return <label className={className}><span className={label}>{text}</span><textarea {...rest} className={input} rows={3} /></label>;
}

function UploadInput({ label: text, onUpload, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; onUpload: (files: FileList | null, target: HTMLInputElement) => void }) {
  return (
    <label>
      <span className={label}>{text}</span>
      <input {...rest} className={input} placeholder="Upload or paste image URL" />
      <input type="file" accept="image/*" onChange={(event) => {
        const target = event.currentTarget.parentElement?.querySelector("input[type='text'],input:not([type])");
        if (target instanceof HTMLInputElement) void onUpload(event.currentTarget.files, target);
        event.currentTarget.value = "";
      }} className="mt-2 w-full text-xs" />
    </label>
  );
}

function ProjectEditor({ project, saving, upload, onSaved, setMessage }: { project: Project; saving: boolean; upload: (files: FileList | null, target: HTMLInputElement | HTMLTextAreaElement, folder: string) => Promise<void>; onSaved: () => Promise<void>; setMessage: (message: string | null) => void }) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    project.latitude && project.longitude ? { lat: Number(project.latitude), lng: Number(project.longitude) } : null,
  );
  const [showPin, setShowPin] = useState(false);

  return (
    <form
      className="mt-4 rounded-xl border border-navy-100 bg-white p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/developer-inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "project",
            id: project.id,
            projectName: project.projectName,
            slug: project.slug,
            status: project.status,
            active: project.active,
            address: project.address || "",
            barangay: project.barangay || "",
            city: project.city || "Davao City",
            province: project.province || "Davao del Sur",
            description: project.description || "",
            amenities: project.amenities || [],
            gallery: project.gallery || [],
            heroImage: form.get("heroImage") || "",
            latitude: pin?.lat || "",
            longitude: pin?.lng || "",
          }),
        });
        const data = await readJson(response);
        setMessage(response.ok ? "Project updated." : data.error || "Could not update project.");
        if (response.ok) await onSaved();
      }}
    >
      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <div>
          <p className={label}>Hero image</p>
          <div className="image-zoom-frame h-28 overflow-hidden rounded-lg border bg-navy-50">
            {project.heroImage ? <img src={project.heroImage} alt="" className="zoomable-image h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-navy-400">No hero</div>}
          </div>
        </div>
        <div className="grid gap-3">
          <label>
            <span className={label}>Change / delete hero image</span>
            <input name="heroImage" defaultValue={project.heroImage || ""} className={input} placeholder="Upload or paste hero image URL" />
          </label>
          <div className="flex flex-wrap gap-2">
            <input type="file" accept="image/*" onChange={(event) => {
              const target = event.currentTarget.closest("form")?.querySelector("input[name='heroImage']");
              if (target instanceof HTMLInputElement) void upload(event.currentTarget.files, target, "project-hero");
              event.currentTarget.value = "";
            }} className="text-xs" />
            <button type="button" onClick={(event) => {
              const target = event.currentTarget.closest("form")?.querySelector("input[name='heroImage']");
              if (target instanceof HTMLInputElement) target.value = "";
            }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete hero</button>
            <button type="button" onClick={() => setShowPin((value) => !value)} className="rounded-lg border border-navy-200 px-3 py-2 text-xs font-bold text-navy-800">Manual map pin</button>
          </div>
          {pin && <p className="text-xs text-navy-500">Pin: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</p>}
        </div>
      </div>
      {showPin && <div className="mt-4"><LocationPicker value={pin} onChange={setPin} /></div>}
      <button disabled={saving} className="mt-4 min-h-11 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save project hero / pin</button>
    </form>
  );
}

function UploadTextArea({ label: text, onUpload, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; onUpload: (files: FileList | null, target: HTMLTextAreaElement) => void }) {
  return (
    <label>
      <span className={label}>{text}</span>
      <textarea {...rest} className={input} rows={3} />
      <input type="file" accept="image/*" multiple onChange={(event) => {
        const textarea = event.currentTarget.parentElement?.querySelector("textarea");
        if (textarea) void onUpload(event.currentTarget.files, textarea);
        event.currentTarget.value = "";
      }} className="mt-2 w-full text-xs" />
    </label>
  );
}
