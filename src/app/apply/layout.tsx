import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to List, Sell, or Collaborate",
  description:
    "Apply to list a property, sell with MM Properties, or collaborate as an agent, broker, appraiser, or real estate partner in Davao.",
  alternates: {
    canonical: "/apply",
  },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
