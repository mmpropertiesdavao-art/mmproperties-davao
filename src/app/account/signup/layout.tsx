import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Buyer Account",
  description:
    "Create a buyer account with MM Properties to save Davao listings and keep property inquiries connected.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BuyerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
