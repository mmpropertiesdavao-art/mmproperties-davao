import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Davao Properties for Sale and Rent",
  description:
    "Browse Davao City houses, condos, lots, commercial spaces, rentals, financing-friendly listings, and new developer projects on the MM Properties map.",
  alternates: {
    canonical: "/search",
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
