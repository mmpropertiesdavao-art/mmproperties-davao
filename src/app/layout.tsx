import type { Metadata } from "next";
import "./globals.css";
import "./interactive.css";
import { CompareTray } from "@/components/compare/CompareTray";
import { PropertyModalProvider } from "@/components/property/PropertyModalProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MessengerButton } from "@/components/layout/MessengerButton";
import { Figtree } from "next/font/google";

const figtree=Figtree({subsets:["latin"],display:"swap"});

export const metadata: Metadata = {
  metadataBase: new URL("https://mmpropertiesdavao.com"),
  title: {
    default: "MM Properties | Davao Real Estate",
    template: "%s | MM Properties",
  },
  description:
    "Search houses, condos, lots, and commercial properties for sale in Davao City. Compare listings, explore neighborhoods, and connect with local agents.",
  openGraph: {
    type: "website",
    siteName: "MM Properties Davao",
    title: "MM Properties | Davao Real Estate",
    description:
      "Davao-focused property search for homes, lots, condos, and commercial investments.",
    url: "https://mmpropertiesdavao.com",
    images: [
      {
        url: "/mm-social-preview.png",
        width: 1200,
        height: 630,
        alt: "MM Properties Davao Real Estate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MM Properties | Davao Real Estate",
    description:
      "Davao-focused property search for homes, lots, condos, and commercial investments.",
    images: ["/mm-social-preview.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/mm-favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: "/mm-favicon.png",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MM Properties",
  url: "https://mmpropertiesdavao.com",
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
      <body className={`${figtree.className} flex min-h-screen flex-col bg-slate-50 text-slate-900`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgJsonLd),
          }}
        />

        <PropertyModalProvider>
        <SiteHeader />
        <main className="min-w-0 flex-1">{children}</main>
        <SiteFooter />
        <MessengerButton />
        <CompareTray />
        </PropertyModalProvider>
      </body>
    </html>
  );
}
