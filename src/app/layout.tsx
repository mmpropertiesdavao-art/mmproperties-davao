import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import "./interactive.css";
import { AccountLink } from "@/components/auth/AccountLink";
import { CompareTray } from "@/components/compare/CompareTray";
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

        <header className="border-b border-navy-800 bg-navy-900 text-white">
  <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

    {/* LEFT SIDE - LOGO */}
    <Link href="/" className="flex items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-md">
        <Image
          src="/logo.jpg"
          alt="MM Properties"
          width={58}
          height={58}
          className="object-contain"
          priority
        />
      </div>

      <div>
        <div className="text-3xl font-bold leading-none">
          MM <span className="text-gold-400">Properties</span>
        </div>
        <div className="text-sm text-slate-300">
          Davao Real Estate
        </div>
      </div>
    </Link>

    {/* RIGHT SIDE - NAVIGATION */}
    <nav className="flex items-center gap-8 text-sm font-medium">
      <Link href="/search" className="transition hover:text-gold-400">
        Search
      </Link>

      <Link href="/neighborhoods" className="transition hover:text-gold-400">
        Neighborhoods
      </Link>

      <Link href="/compare" className="transition hover:text-gold-400">
        Compare
      </Link>

      <Link href="/matcher" className="transition hover:text-gold-400">
        MM Pulse
      </Link>

      <Link href="/guides" className="transition hover:text-gold-400">
        Guides
      </Link>

      <AccountLink />
    </nav>

  </div>
</header>

        <main>{children}</main><CompareTray />
      </body>
    </html>
  );
}
