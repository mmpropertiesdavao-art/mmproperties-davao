import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MM Properties Seller Dashboard",
  description:
    "Manage MM Properties seller listings, leads, inquiries, and property updates.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
