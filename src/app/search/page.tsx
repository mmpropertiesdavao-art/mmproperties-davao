"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { FilterBar } from "@/components/search/FilterBar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { DeveloperProjectCard } from "@/components/developer/DeveloperProjectCard";
import type { Property, PropertySearchFilters } from "@/types/property";

const MapView = dynamic(() => import("@/components/search/MapView").then((m) => m.MapView), { ssr: false });

export default function SearchPage() {
  const [results, setResults] = useState<Property[]>([]);
  const [mapResults, setMapResults] = useState<Property[]>([]);
  const [filters, setFilters] = useState<PropertySearchFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [developerProjects, setDeveloperProjects] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    const urlParams = new URLSearchParams(window.location.search);
    ["listingIntent","financingAvailable","assumeBalanceAvailable","isForeclosed","propertyType","minPrice","maxPrice"].forEach((key)=>{const value=urlParams.get(key);if(value)params.set(key,value)});
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value));
    });
    const initialQuery = urlParams.get("q");
    if (initialQuery) params.set("q", initialQuery);
    const developerName = urlParams.get("developerName");
    if (developerName) params.set("developerName", developerName);

    setError(null);
    fetch(`/api/properties/search?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search failed");
        return response.json();
      })
      .then(async (data) => {
        const count = Number(data.totalCount ?? 0);
        setResults(data.results ?? []);
        setTotalCount(count);

        fetch(`/api/developer-projects?${params.toString()}`, { signal: controller.signal })
          .then(async (projectResponse) => {
            if (!projectResponse.ok) return { results: [] };
            return projectResponse.json();
          })
          .then((projectData) => setDeveloperProjects(projectData.results ?? []))
          .catch((projectError) => {
            if (projectError instanceof DOMException && projectError.name === "AbortError") return;
            setDeveloperProjects([]);
          });

        if (count === 0) {
          setMapResults([]);
          return;
        }

        // Card pagination must never hide matching pins. Fetch one map data
        // page sized to the actual result count while cards remain at 24.
        const mapParams = new URLSearchParams(params);
        mapParams.set("page", "1");
        mapParams.set("pageSize", String(count));
        const mapResponse = await fetch(`/api/properties/search?${mapParams.toString()}`, { signal: controller.signal });
        if (!mapResponse.ok) throw new Error("Map search failed");
        const mapData = await mapResponse.json();
        setMapResults(mapData.results ?? []);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setResults([]);
        setDeveloperProjects([]);
        setMapResults([]);
        setError("We could not load listings right now. Please try again.");
      });
    return () => controller.abort();
  }, [filters]);

  return (
    <div className="min-h-[calc(100vh-80px)]">
      <FilterBar onChange={(next) => setFilters({ ...next, page: 1 })} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(440px,48vw)]">
        <div className="min-w-0 p-4">
          <p className="mb-3 text-sm text-gray-500">{totalCount} properties found · {developerProjects.length} new developments</p>
          {error && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                slug={property.slug}
                title={property.title}
                price={property.price}
                bedrooms={property.bedrooms}
                bathrooms={property.bathrooms}
                floorAreaSqm={property.floorAreaSqm}
                lotAreaSqm={property.lotAreaSqm}
                coverImageUrl={property.coverImageUrl}
                neighborhoodName={property.neighborhoodName}
                barangay={property.barangay}
                isForeclosed={property.isForeclosed}
                propertyType={property.propertyType}
                listingIntent={property.listingIntent}
                availability={property.availability}
                rentPrice={property.rentPrice}
                financingAvailable={property.financingAvailable}
                assumeBalanceAvailable={property.assumeBalanceAvailable}
                previousPrice={property.previousPrice}
                agentName={property.agentName}
                agencyName={property.agencyName}
                parkingSpaces={property.parkingSpaces}
                daysListed={property.daysListed}
                viewCount={property.viewCount}
                saveCount={property.saveCount}
              />
            ))}
            {developerProjects.map((project) => (
              <DeveloperProjectCard
                key={project.id}
                slug={project.slug}
                projectName={project.projectName}
                developerName={project.developerName}
                status={project.status}
                barangay={project.barangay}
                city={project.city}
                province={project.province}
                heroImage={project.heroImage}
                startingPrice={project.startingPrice}
                modelCount={project.modelCount}
                availableUnits={project.availableUnits}
                hasLotOnly={project.hasLotOnly}
                bedroomsMin={project.bedroomsMin}
                bedroomsMax={project.bedroomsMax}
                bathroomsMin={project.bathroomsMin}
                bathroomsMax={project.bathroomsMax}
                floorAreaMin={project.floorAreaMin}
                floorAreaMax={project.floorAreaMax}
                lotAreaMin={project.lotAreaMin}
                lotAreaMax={project.lotAreaMax}
              />
            ))}
          </div>
          {totalCount > 24 && <div className="mt-6 flex items-center justify-center gap-3 pb-6"><button disabled={(filters.page ?? 1) <= 1} onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-navy-500">Page {filters.page ?? 1} of {Math.ceil(totalCount / 24)}</span><button disabled={(filters.page ?? 1) >= Math.ceil(totalCount / 24)} onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))} className="rounded-md border px-4 py-2 text-sm disabled:opacity-40">Next</button></div>}
        </div>

        <aside className="min-w-0 border-t lg:self-stretch lg:border-l lg:border-t-0">
          <div className="h-[420px] overflow-hidden lg:sticky lg:top-0 lg:h-screen">
            <MapView
              properties={[
                ...mapResults.map((property) => ({
                id: property.id,
                slug: property.slug,
                title: property.title,
                price: property.price,
                lat: property.lat,
                lng: property.lng,
                neighborhoodName: property.neighborhoodName,
                listingIntent: property.listingIntent,
                rentPrice: property.rentPrice,
                })),
                ...developerProjects
                  .filter((project) => Number.isFinite(Number(project.latitude)) && Number.isFinite(Number(project.longitude)) && project.startingPrice)
                  .map((project) => ({
                    id: `project-${project.id}`,
                    slug: project.slug,
                    title: project.projectName,
                    price: Number(project.startingPrice),
                    lat: Number(project.latitude),
                    lng: Number(project.longitude),
                    neighborhoodName: project.barangay || project.city,
                    listingIntent: "new_development" as const,
                    pinType: "developer_project" as const,
                  })),
              ]}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
