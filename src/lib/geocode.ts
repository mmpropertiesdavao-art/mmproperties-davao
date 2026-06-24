// src/lib/geocode.ts

interface GeocodeResult {
  lng: number;
  lat: number;
  confidence: "high" | "low";
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const lower = address.toLowerCase();

  // Davao neighborhood centers
  if (lower.includes("lanang")) {
    return {
      lng: 125.6508,
      lat: 7.1264,
      confidence: "high",
    };
  }

  if (lower.includes("ecoland")) {
    return {
      lng: 125.6015,
      lat: 7.0505,
      confidence: "high",
    };
  }

  if (lower.includes("toril")) {
    return {
      lng: 125.4889,
      lat: 6.9367,
      confidence: "high",
    };
  }

  if (lower.includes("matina")) {
    return {
      lng: 125.6035,
      lat: 7.0628,
      confidence: "high",
    };
  }

  if (lower.includes("buhangin")) {
    return {
      lng: 125.6208,
      lat: 7.1137,
      confidence: "high",
    };
  }

  if (lower.includes("maa")) {
    return {
      lng: 125.586,
      lat: 7.093,
      confidence: "high",
    };
  }

  // Fallback: Davao City center
  return {
    lng: 125.6128,
    lat: 7.0731,
    confidence: "low",
  };
}