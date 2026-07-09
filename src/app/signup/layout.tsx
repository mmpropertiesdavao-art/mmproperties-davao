import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a Seller or Agent Account",
  description:
    "Create your MM Properties seller, agent, or collaborator account after approval.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PartnerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
