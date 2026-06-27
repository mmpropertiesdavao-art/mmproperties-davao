import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import { PlacesManager } from "@/components/admin/PlacesManager";

export const dynamic = "force-dynamic";

export default async function AdminPlacesPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Places & Amenities
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Curate barangays, subdivisions, landmarks, malls, schools, and other local places. Manual pins help improve neighborhood intelligence, property matching, and nearby-place accuracy as more listings are added.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/listings" className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
              Back to Listings
            </Link>
            <Link href="/admin" className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
              Admin Dashboard
            </Link>
          </div>
        </div>

        <PlacesManager />
      </div>
    </main>
  );
}
