import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Security",
  description:
    "Review MM Properties account security and manage Google account access settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountSecurityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
