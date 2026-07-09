import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MM Properties Account",
  description:
    "Manage your saved Davao properties, account access, and MM Properties profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
