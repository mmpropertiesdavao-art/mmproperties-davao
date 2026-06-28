import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-gold-500 bg-navy-900 text-white shadow-[0_-8px_24px_rgba(15,23,42,.22)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-gold-400">
            <Image src="/mmprologo_new.png" alt="MM Properties" width={42} height={42} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-wide text-white drop-shadow-sm">
              MM <span className="text-gold-400">Properties</span>
            </p>
            <p className="truncate text-xs font-semibold text-white/90">Davao Real Estate</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end md:text-right">
          <nav className="flex flex-wrap gap-2 text-sm font-bold md:justify-end">
            <Link
              href="/privacy-policy"
              className="rounded-full bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/15 hover:bg-gold-400 hover:text-navy-950"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="rounded-full bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/15 hover:bg-gold-400 hover:text-navy-950"
            >
              Terms of Service
            </Link>
            <Link
              href="/about"
              className="rounded-full bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/15 hover:bg-gold-400 hover:text-navy-950"
            >
              About Us
            </Link>
          </nav>
          <p className="text-xs font-semibold text-white/85">© 2026 MM Properties. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
