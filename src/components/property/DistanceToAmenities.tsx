// src/components/property/DistanceToAmenities.tsx
interface Amenity {
  name: string;
  category: string;
  distance_m: number;
}

export function DistanceToAmenities({ amenities }: { amenities: Amenity[] }) {
  return (
    <div className="rounded-xl border p-5">
      <h3 className="mb-3 text-lg font-semibold">Nearby amenities</h3>
      <ul className="space-y-2 text-sm">
        {amenities.map((a) => (
          <li key={a.name} className="flex justify-between">
            <span>{a.name}</span>
            <span className="text-gray-500">{(a.distance_m / 1000).toFixed(1)} km</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
