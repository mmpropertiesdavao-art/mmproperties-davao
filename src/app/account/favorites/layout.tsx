import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Davao Properties",
  description:
    "View your saved MM Properties listings and shortlist of Davao homes, condos, lots, and commercial properties.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
