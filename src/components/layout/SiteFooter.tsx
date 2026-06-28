import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-gold-400">
            <Image src="/mmprologo_new.png" alt="MM Properties" width={62} height={62} className="object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold">
              MM <span className="text-gold-400">Properties</span>
            </p>
            <p className="mt-1 text-sm text-slate-300">Davao Real Estate</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
              Local Davao property search for buyers, sellers, and investors.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:items-end md:text-right">
          <nav className="flex flex-wrap gap-4 text-sm font-semibold text-slate-200 md:justify-end">
            <Link href="/privacy-policy" className="hover:text-gold-300">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-gold-300">Terms of Service</Link>
            <Link href="/about" className="hover:text-gold-300">Contact Us</Link>
          </nav>
          <p className="text-sm text-slate-400">© 2026 MM Properties. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
