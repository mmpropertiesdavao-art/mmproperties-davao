import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Davao Property Listings",
  description:
    "Compare up to four Davao properties side by side, including price, location, lot area, floor area, bedrooms, bathrooms, and offer type.",
  alternates: {
    canonical: "/compare",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
