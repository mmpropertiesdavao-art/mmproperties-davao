// src/types/property.ts

export type PropertyTypeSlug =
  | "house-and-lot"
  | "condominium"
  | "lot-only"
  | "commercial"
  | "townhouse"
  | "foreclosed";

export interface Property {
  id: string;
  publicId?: string;
  slug: string;
  title: string;
  description: string;
  propertyType: PropertyTypeSlug;
  propertyTypeLabel: string;
  developerName: string | null;
  price: number;
  monthlyAmortization: number | null;
  downpaymentPercent: number | null;
  paymentTerms: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floorAreaSqm: number | null;
  lotAreaSqm: number | null;
  parkingSpaces?: number | null;
  neighborhoodName: string;
  neighborhoodSlug: string;
  primaryPlace?: string | null;
  nearbyPlaces?: string[];
  barangay: string | null;
  address: string;
  lat: number;
  lng: number;
  coverImageUrl: string;
  isForeclosed: boolean;
  isFeatured: boolean;
  carouselEnabled?: boolean;
  carouselOrder?: number;
  status: "active" | "pending" | "sold" | "inactive";
  listingIntent: "sale" | "rent" | "sale_or_rent";
  availability: "available" | "reserved" | "rented" | "sold" | "inactive";
  rentPrice: number | null;
  financingAvailable: boolean;
  assumeBalanceAvailable: boolean;
  previousPrice: number | null;
  priceReducedAt: string | null;
  agentName: string | null;
  agencyName: string | null;
  daysListed: number;
  viewCount: number;
  saveCount: number;
}

export interface PropertySearchFilters {
  minPrice?: number;
  maxPrice?: number;
  propertyType?: PropertyTypeSlug;
  developerName?: string;
  neighborhoodId?: string;
  barangay?: string;
  minBedrooms?: number;
  minBathrooms?: number;
  minFloorAreaSqm?: number;
  minLotAreaSqm?: number;
  maxMonthlyAmortization?: number;
  minDownpaymentPercent?: number;
  isForeclosed?: boolean;
  financingAvailable?: boolean;
  assumeBalanceAvailable?: boolean;
  listingIntent?: "sale" | "rent" | "sale_or_rent";
  // Geospatial — at most one of these is set per request
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  radius?: { lng: number; lat: number; meters: number };
  polygon?: GeoJSON.Polygon;
  query?: string; // free-text search term
  page?: number;
  pageSize?: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  barangay: string | null;
  city: string;
  overview: string;
  avgPricePerSqm: number | null;
  advantages: string[];
  disadvantages: string[];
  centroid: { lat: number; lng: number };
}

export interface Inquiry {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  isRemoteBuyer: boolean;
  status: "new" | "contacted" | "follow_up" | "interested" | "under_contract" | "closed" | "lost";
  scheduledViewingAt: string | null;
}

export interface MatcherInput {
  budget: number;
  familySize: number;
  preferredAreas: string[]; // neighborhood slugs
  propertyType?: PropertyTypeSlug | "new-development" | "";
  lifestyle: string[]; // e.g. ["near_schools", "quiet", "near_malls"]
}

export interface MatchedProperty extends Property {
  matchReason: string;
  matchScore: number;
  distanceKm: number;
  outsidePreferredArea: boolean;
}
