import type { Metadata } from "next";
import "./globals.css";
import "./interactive.css";
import { CompareTray } from "@/components/compare/CompareTray";
import { PropertyModalProvider } from "@/components/property/PropertyModalProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Figtree } from "next/font/google";

const figtree=Figtree({subsets:["latin"],display:"swap"});

export const metadata: Metadata = {
  title: {
    default: "MM Properties | Davao Real Estate",
    template: "%s | MM Properties",
  },
  description:
    "Search houses, condos, lots, and commercial properties for sale in Davao City. Compare listings, explore neighborhoods, and connect with local agents.",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MM Properties",
  url: "https://mmproperties.com",
  description:
    "MM Properties – Real estate listings and property discovery in Davao City.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${figtree.className} bg-slate-50 text-slate-900`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd),
          }}
        />

        <PropertyModalProvider>
        <SiteHeader />
        <main className="overflow-x-clip">{children}</main><CompareTray />
        </PropertyModalProvider>
      </body>
    </html>
  );
}
