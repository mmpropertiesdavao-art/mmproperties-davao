import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login to MM Properties",
  description:
    "Log in to access your MM Properties buyer, seller, agent, or admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
