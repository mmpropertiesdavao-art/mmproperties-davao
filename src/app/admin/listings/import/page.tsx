"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { LocationPicker } from "@/components/map/LocationPicker";

interface RowResult {
  row: number;
  title: string;
  status: "created" | "failed";
  error?: string;
}

interface ImportRow extends Record<string, string> {
  title: string;
  propertyTypeSlug: string;
  price: string;
  address: string;
  lat: string;
  lng: string;
}

const REQUIRED_COLUMNS = ["title", "propertyTypeSlug", "price", "address"];
const ALLOWED_TYPES = new Set(["house-and-lot", "condominium", "lot-only", "commercial", "townhouse", "foreclosed"]);

export default function BulkImportPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activePinRow, setActivePinRow] = useState<number | null>(null);

  const rowErrors = useMemo(() => parsedRows.map(validateRow), [parsedRows]);
  const invalidCount = rowErrors.filter(Boolean).length;

  function handleFile(file: File) {
    setFileName(file.name);
    setParseError(null);
    setResults(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (parsed) => {
        const missing = REQUIRED_COLUMNS.filter((column) => !parsed.meta.fields?.includes(column));
        if (missing.length > 0) {
          setParseError(`Missing required column(s): ${missing.join(", ")}. Use the latest template.`);
          setParsedRows([]);
          return;
        }

        const rows = parsed.data
          .filter((row) => Object.values(row).some((value) => String(value ?? "").trim()))
          .map((row) => ({
            ...row,
            title: String(row.title ?? "").trim(),
            propertyTypeSlug: String(row.propertyTypeSlug ?? "").trim(),
            price: String(row.price ?? "").replace(/[,₱]/g, "").trim(),
            address: String(row.address ?? "").trim(),
            lat: String(row.lat ?? "").trim(),
            lng: String(row.lng ?? "").trim(),
          })) as ImportRow[];

        if (rows.length > 200) {
          setParseError("This file has more than 200 listings. Split it into smaller files and try again.");
          setParsedRows([]);
          return;
        }
        setParsedRows(rows);
      },
      error: (error) => setParseError(error.message),
    });
  }

  function setPin(index: number, value: { lat: number; lng: number }) {
    setParsedRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, lat: value.lat.toFixed(6), lng: value.lng.toFixed(6) } : row,
      ),
    );
  }

  async function handleImport() {
    if (invalidCount > 0 || parsedRows.length === 0) return;
    setSubmitting(true);
    setParseError(null);

    try {
      const rows = parsedRows.map((row) => ({
        title: row.title,
        propertyTypeSlug: row.propertyTypeSlug,
        price: Number(row.price),
        address: row.address,
        description: row.description || undefined,
        developerName: row.developerName || undefined,
        monthlyAmortization: optionalNumber(row.monthlyAmortization),
        downpaymentPercent: optionalNumber(row.downpaymentPercent),
        bedrooms: optionalNumber(row.bedrooms),
        bathrooms: optionalNumber(row.bathrooms),
        floorAreaSqm: optionalNumber(row.floorAreaSqm),
        lotAreaSqm: optionalNumber(row.lotAreaSqm),
        parkingSpaces: optionalNumber(row.parkingSpaces),
        neighborhoodSlug: row.neighborhoodSlug || undefined,
        primaryPlace: row.primaryPlace || row.neighborhoodSlug || undefined,
        nearbyPlaces: row.nearbyPlaces ? row.nearbyPlaces.split(/[;|]/).map((x) => x.trim()).filter(Boolean) : undefined,
        barangay: row.barangay || undefined,
        paymentTerms: row.paymentTerms || undefined,
        isForeclosed: row.isForeclosed?.toLowerCase() === "true",
        listingIntent: row.listingIntent || "sale",
        availability: row.availability || "available",
        rentPrice: optionalNumber(row.rentPrice),
        financingAvailable: row.financingAvailable?.toLowerCase() === "true",
        assumeBalanceAvailable: row.assumeBalanceAvailable?.toLowerCase() === "true",
        lat: optionalNumber(row.lat),
        lng: optionalNumber(row.lng),
        allowDuplicate: row.allowDuplicate?.toLowerCase() === "true",
      }));

      const response = await fetch("/api/admin/properties/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed.");
      setResults(data.results ?? []);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-navy-900">Bulk import listings</h1>
      <p className="mt-1 max-w-3xl text-sm text-navy-500">
        Upload a CSV, review every row, and set an exact pin when the written address is not precise. Rows without a pin use an approximate Davao-area location and should be reviewed later.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a href="/templates/listings-template-v2.csv" download className="rounded-md border border-gold-500 px-4 py-2 text-sm font-medium text-navy-900 hover:bg-gold-50">
          Download CSV template
        </a>
        <label className="cursor-pointer rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
          Choose CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} className="sr-only" />
        </label>
      </div>

      {fileName && <p className="mt-3 text-sm text-navy-500">{fileName} · {parsedRows.length} listing(s) found</p>}
      {parseError && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{parseError}</p>}

      {parsedRows.length > 0 && !results && (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-navy-100 bg-white">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-navy-50 text-navy-700">
                <tr><th className="p-3">Row</th><th className="p-3">Listing</th><th className="p-3">Price</th><th className="p-3">Address</th><th className="p-3">Exact location</th><th className="p-3">Check</th></tr>
              </thead>
              <tbody>
                {parsedRows.map((row, index) => {
                  const error = rowErrors[index];
                  const hasPin = Boolean(row.lat && row.lng);
                  return (
                    <tr key={`${row.title}-${index}`} className="border-t border-navy-100 align-top">
                      <td className="p-3 text-navy-400">{index + 2}</td>
                      <td className="p-3 font-medium text-navy-900">{row.title || "Untitled"}<div className="text-xs font-normal text-navy-400">{row.propertyTypeSlug}</div></td>
                      <td className="p-3">{Number(row.price).toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })}</td>
                      <td className="max-w-xs p-3 text-navy-600">{row.address}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => setActivePinRow(index)} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${hasPin ? "border-green-300 bg-green-50 text-green-800" : "border-gold-400 text-navy-800"}`}>
                          {hasPin ? "Pinned · Edit" : "Set pin"}
                        </button>
                        {hasPin && <div className="mt-1 text-[11px] text-navy-400">{row.lat}, {row.lng}</div>}
                      </td>
                      <td className={`p-3 text-xs ${error ? "text-red-600" : "text-green-700"}`}>{error || "Ready"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activePinRow !== null && (
            <div className="mt-5 rounded-lg border border-gold-300 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div><h2 className="font-semibold text-navy-900">Pin row {activePinRow + 2}: {parsedRows[activePinRow].title}</h2><p className="text-sm text-navy-500">Click the map or drag the marker to the property entrance.</p></div>
                <button type="button" onClick={() => setActivePinRow(null)} className="text-sm text-navy-500 underline">Done</button>
              </div>
              <LocationPicker
                value={parsedRows[activePinRow].lat && parsedRows[activePinRow].lng ? { lat: Number(parsedRows[activePinRow].lat), lng: Number(parsedRows[activePinRow].lng) } : null}
                onChange={(value) => setPin(activePinRow, value)}
              />
            </div>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button onClick={handleImport} disabled={submitting || invalidCount > 0} className="rounded-md bg-gold-500 px-6 py-3 font-medium text-navy-900 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Importing…" : `Import ${parsedRows.length} listings`}
            </button>
            <p className={`text-sm ${invalidCount ? "text-red-600" : "text-navy-500"}`}>{invalidCount ? `Fix ${invalidCount} invalid row(s) first.` : "All rows passed validation."}</p>
          </div>
        </>
      )}

      {results && (
        <div className="mt-6 rounded-lg border border-navy-100 bg-white p-5">
          <h2 className="font-semibold text-navy-900">Import complete</h2>
          <p className="mt-1 text-sm text-navy-600">{results.filter((item) => item.status === "created").length} created · {results.filter((item) => item.status === "failed").length} failed</p>
          <div className="mt-4 space-y-2 text-sm">{results.map((item) => <div key={item.row} className={item.status === "created" ? "text-green-700" : "text-red-600"}>Row {item.row + 1}: {item.title} — {item.error ?? "Created"}</div>)}</div>
        </div>
      )}
    </div>
  );
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.replace(/[,₱]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateRow(row: ImportRow): string | null {
  if (!row.title || !row.propertyTypeSlug || !row.price || !row.address) return "Missing a required value";
  if (!ALLOWED_TYPES.has(row.propertyTypeSlug)) return "Unknown property type";
  if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) return "Price must be greater than zero";
  if ((row.lat && !row.lng) || (!row.lat && row.lng)) return "Latitude and longitude must be supplied together";
  if (row.lat && (Number(row.lat) < 6.7 || Number(row.lat) > 7.5 || Number(row.lng) < 125.2 || Number(row.lng) > 126)) return "Pin is outside the Davao area";
  return null;
}
