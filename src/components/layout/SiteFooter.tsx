import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-gold-500 bg-navy-950 text-white shadow-[0_-8px_24px_rgba(15,23,42,.18)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-gold-400">
            <Image src="/mmprologo_new.png" alt="MM Properties" width={42} height={42} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-wide text-white">
              MM <span className="text-gold-400">Properties</span>
            </p>
            <p className="truncate text-xs font-medium text-slate-200">Davao Real Estate</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end md:text-right">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-white md:justify-end">
            <Link href="/privacy-policy" className="text-slate-100 hover:text-gold-300">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-slate-100 hover:text-gold-300">Terms of Service</Link>
            <Link href="/about" className="text-slate-100 hover:text-gold-300">Contact Us</Link>
          </nav>
          <p className="text-xs font-medium text-slate-300">© 2026 MM Properties. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
