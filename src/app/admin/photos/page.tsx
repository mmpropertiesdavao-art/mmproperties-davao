"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminListingTable, type AdminListingRow } from "@/components/admin/AdminListingTable";

interface SavedPhoto {
  id: string;
  url: string;
  altText: string | null;
  isCover: boolean;
}

export default function AdminPhotosPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-6 py-8">Loading photo manager...</div>}>
      <AdminPhotosContent />
    </Suspense>
  );
}

function AdminPhotosContent() {
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get("propertyId") ?? "";

  const [properties, setProperties] = useState<AdminListingRow[]>([]);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [files, setFiles] = useState<File[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selectedProperty = properties.find((property) => property.id === propertyId);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    fetch("/api/admin/properties/list", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (response.ok && Array.isArray(data)) {
          setProperties(data);

          if (initialPropertyId) {
            const exists = data.some((property: AdminListingRow) => property.id === initialPropertyId);

            if (exists) {
              setPropertyId(initialPropertyId);
              void loadSavedPhotos(initialPropertyId);
            } else {
              setMessage({ ok: false, text: "Selected listing was not found or you do not have access to it." });
            }
          }
        } else {
          setMessage({ ok: false, text: data.error ?? "Could not load listings." });
        }
      })
      .catch(() => {
        setMessage({ ok: false, text: "Could not load listings. Check your connection and try again." });
      });
  }, [initialPropertyId]);

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function chooseProperty(property: AdminListingRow) {
    setPropertyId(property.id);
    setFiles([]);
    setMessage(null);
    void loadSavedPhotos(property.id);
    window.history.replaceState(null, "", `/admin/photos?propertyId=${property.id}`);
  }

  async function loadSavedPhotos(id: string) {
    if (!id) {
      setSavedPhotos([]);
      setSelectedPhotoIds([]);
      return;
    }

    setSelectedPhotoIds([]);
    setLoadingPhotos(true);

    try {
      const response = await fetch(`/api/admin/properties/${id}/photos`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Could not load saved photos.");

      setSavedPhotos(Array.isArray(data) ? data : []);
    } catch (error) {
      setSavedPhotos([]);
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not load saved photos." });
    } finally {
      setLoadingPhotos(false);
    }
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const incoming = Array.from(fileList);
    const invalid = incoming.find((file) => !isSupportedImage(file) || file.size > 8 * 1024 * 1024);

    if (invalid) {
      const reason = fileSizeTooLarge(invalid)
        ? "is larger than 8 MB"
        : "must be a JPG, JPEG, JFIF, PNG, WebP, or AVIF image";
      setMessage({ ok: false, text: `${invalid.name} ${reason}.` });
      return;
    }

    setFiles((current) => {
      const known = new Set(current.map(fileKey));
      return [...current, ...incoming.filter((file) => !known.has(fileKey(file)))].slice(0, 12);
    });

    setMessage(null);
  }

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function togglePhoto(id: string) {
    setSelectedPhotoIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function deleteSelectedPhotos() {
    if (!propertyId || selectedPhotoIds.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedPhotoIds.length} selected photo(s)? This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: selectedPhotoIds }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error ?? "Could not delete the selected photos.");

      await loadSavedPhotos(propertyId);

      setMessage({
        ok: true,
        text: `${data.deletedCount} photo(s) deleted.${data.warning ? ` ${data.warning}` : ""}`,
      });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Photo deletion failed." });
    } finally {
      setDeleting(false);
    }
  }

  async function setCoverPhoto(photoId: string) {
    if (!propertyId) return;

    setSettingCoverId(photoId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error ?? "Could not update the cover photo.");

      setSavedPhotos((current) =>
        current.map((photo) => ({
          ...photo,
          isCover: photo.id === photoId,
        })),
      );

      setMessage({ ok: true, text: "Cover photo updated." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not update the cover photo." });
    } finally {
      setSettingCoverId(null);
    }
  }

  async function upload() {
    if (!propertyId || files.length === 0) {
      setMessage({ ok: false, text: "Choose a property and at least one photo." });
      return;
    }

    setUploading(true);
    setMessage(null);
    setProgress({ completed: 0, total: files.length });

    let uploadedCount = 0;

    try {
      for (let start = 0; start < files.length; start += 4) {
        const batch = files.slice(start, start + 4);
        const formData = new FormData();

        formData.append("propertyId", propertyId);
        batch.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/admin/photos/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error ?? `Upload stopped with status ${response.status}.`);
        }

        uploadedCount += data.uploaded?.length ?? batch.length;
        setProgress({ completed: uploadedCount, total: files.length });
      }

      setFiles([]);
      await loadSavedPhotos(propertyId);

      setMessage({
        ok: true,
        text: `${uploadedCount} photo(s) uploaded and saved to this listing.`,
      });
    } catch (error) {
      setMessage({
        ok: false,
        text: `${uploadedCount > 0 ? `${uploadedCount} photo(s) were saved. ` : ""}${
          error instanceof Error ? error.message : "Upload failed."
        }`,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-navy-900">Manage listing photos</h1>
      <p className="mt-1 text-sm text-navy-400">
        Choose a listing first. After selection, the upload and saved-photo tools appear directly below.
      </p>

      <div className="mt-6 space-y-6">
        {message && (
          <p className={`rounded-md p-3 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-navy-800">Choose a property</h2>

          {selectedProperty && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                Selected: <strong>{selectedProperty.title}</strong>
              </p>
              <p className="mt-1 text-xs text-green-700">
                You can now upload photos, view saved photos, delete photos, or set a cover photo below.
              </p>
            </div>
          )}

          <AdminListingTable listings={properties} selectedId={propertyId} onSelect={chooseProperty} />
        </section>

        {propertyId && (
          <section className="rounded-xl border border-navy-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900">Photo tools for selected listing</h2>

            <div className="mt-5 rounded-lg border-2 border-dashed border-navy-200 bg-white p-5">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.jfif,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => addFiles(event.target.files)}
                className="block w-full text-sm"
              />

              <p className="mt-2 text-xs text-navy-400">
                Up to 12 photos, 8 MB each. Files upload in groups of four; the first saved photo becomes the cover.
              </p>
            </div>

            {previews.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {previews.map((preview, index) => (
                  <div key={fileKey(preview.file)} className="overflow-hidden rounded-lg border border-navy-100 bg-white">
                    <img src={preview.url} alt={preview.file.name} className="h-32 w-full object-cover" />

                    <div className="p-2">
                      <p className="truncate text-xs text-navy-500">
                        {index === 0 ? "First - " : ""}
                        {preview.file.name}
                      </p>

                      <p className="text-[11px] text-navy-400">{(preview.file.size / 1024 / 1024).toFixed(1)} MB</p>

                      <div className="mt-2 flex gap-2 text-xs">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveFile(index, -1)}
                          className="disabled:opacity-30"
                        >
                          Left
                        </button>

                        <button
                          type="button"
                          disabled={index === files.length - 1}
                          onClick={() => moveFile(index, 1)}
                          className="disabled:opacity-30"
                        >
                          Right
                        </button>

                        <button
                          type="button"
                          onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={upload}
              disabled={uploading || !propertyId || files.length === 0}
              className="mt-5 rounded-md bg-gold-500 px-6 py-3 font-medium text-navy-900 hover:bg-gold-300 disabled:opacity-50"
            >
              {uploading
                ? `Uploading ${progress.completed} of ${progress.total}...`
                : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}
            </button>

            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-navy-800">Saved photos ({savedPhotos.length})</h2>

                {savedPhotos.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhotoIds(
                          selectedPhotoIds.length === savedPhotos.length ? [] : savedPhotos.map((photo) => photo.id),
                        )
                      }
                      className="font-medium text-navy-700 underline"
                    >
                      {selectedPhotoIds.length === savedPhotos.length ? "Clear selection" : "Select all"}
                    </button>

                    <button
                      type="button"
                      onClick={deleteSelectedPhotos}
                      disabled={deleting || selectedPhotoIds.length === 0}
                      className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 disabled:opacity-40"
                    >
                      {deleting ? "Deleting..." : `Delete selected (${selectedPhotoIds.length})`}
                    </button>
                  </div>
                )}
              </div>

              {loadingPhotos ? (
                <p className="mt-2 text-sm text-navy-400">Loading saved photos...</p>
              ) : savedPhotos.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {savedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`overflow-hidden rounded-md border-2 bg-white ${
                        selectedPhotoIds.includes(photo.id) ? "border-red-500 ring-2 ring-red-100" : "border-navy-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePhoto(photo.id)}
                        className="admin-thumbnail-frame relative block w-full overflow-hidden text-left"
                      >
                        <img
                          src={photo.url}
                          alt={photo.altText || "Listing photo"}
                          className="admin-thumbnail-image h-28 w-full object-cover"
                        />

                        {photo.isCover && (
                          <span className="absolute left-1 top-1 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-semibold text-navy-900">
                            Cover
                          </span>
                        )}

                        <span
                          className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                            selectedPhotoIds.includes(photo.id)
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-white bg-white/90 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>

                      <div className="border-t border-navy-100 p-1.5 text-center">
                        {photo.isCover ? (
                          <span className="text-[11px] font-semibold text-gold-700">Current cover</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCoverPhoto(photo.id)}
                            disabled={settingCoverId !== null}
                            className="text-[11px] font-medium text-navy-700 underline disabled:opacity-40"
                          >
                            {settingCoverId === photo.id ? "Setting..." : "Make cover"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-navy-400">No photos saved to this listing yet.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function isSupportedImage(file: File) {
  if (["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return true;
  return /\.(jpe?g|jfif|png|webp|avif)$/i.test(file.name);
}

function fileSizeTooLarge(file: File) {
  return file.size > 8 * 1024 * 1024;
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}