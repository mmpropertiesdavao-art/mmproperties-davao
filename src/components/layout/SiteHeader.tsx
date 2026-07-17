"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AccountLink } from "@/components/auth/AccountLink";

const navLinks = [
  { href: "/search", label: "Search" },
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/compare", label: "Compare" },
  { href: "/matcher", label: "MM Pulse" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About Us" },
];

type HeaderDeveloper = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [developersOpen, setDevelopersOpen] = useState(false);
  const [developers, setDevelopers] = useState<HeaderDeveloper[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/developers", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setDevelopers(data);
      })
      .catch(() => {
        if (!cancelled) setDevelopers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function closeMenus() {
    setOpen(false);
    setDevelopersOpen(false);
  }

  return (
    <header className="relative z-[5000] border-b border-navy-800 bg-navy-900 text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4" onClick={closeMenus}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md sm:h-16 sm:w-16">
            <Image
              src="/mmprologo_new.png"
              alt="MM Properties"
              width={58}
              height={58}
              className="object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-2xl font-bold leading-none sm:text-3xl">
              MM <span className="text-gold-400">Properties</span>
            </div>
            <div className="truncate text-xs text-slate-300 sm:text-sm">
              Davao Real Estate
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex xl:gap-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-gold-400">
              {link.label}
            </Link>
          ))}
          <div
            className="group relative"
            onMouseEnter={() => setDevelopersOpen(true)}
            onMouseLeave={() => setDevelopersOpen(false)}
            onFocus={() => setDevelopersOpen(true)}
          >
            <Link href="/developers" className="inline-flex items-center gap-1 transition hover:text-gold-400">
              Developers <ChevronDown size={14} className="transition group-hover:rotate-180" />
            </Link>
            <div
              className={`absolute right-0 top-full pt-4 ${developersOpen ? "block" : "hidden"}`}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDevelopersOpen(false);
              }}
            >
              <div className="w-72 overflow-hidden rounded-2xl border border-white/10 bg-white text-navy-900 shadow-2xl ring-1 ring-navy-950/5">
                <div className="border-b border-navy-100 bg-navy-50 px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-gold-700">Developer projects</p>
                  <p className="mt-1 text-xs text-navy-500">Browse Davao projects by developer.</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {developers.length ? developers.map((developer) => (
                    <Link
                      key={developer.id}
                      href={`/developers/${developer.slug}`}
                      onClick={() => setDevelopersOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-navy-800 transition hover:bg-gold-50 hover:text-gold-700"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-navy-100 bg-white">
                        {developer.logoUrl ? <img src={developer.logoUrl} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-xs font-bold">{developer.name.charAt(0)}</span>}
                      </span>
                      <span className="min-w-0 truncate">{developer.name}</span>
                    </Link>
                  )) : (
                    <p className="rounded-xl bg-navy-50 px-3 py-4 text-sm text-navy-500">Developer pages are being updated.</p>
                  )}
                </div>
                <Link href="/developers" onClick={() => setDevelopersOpen(false)} className="block border-t border-navy-100 px-4 py-3 text-sm font-bold text-gold-700 hover:bg-gold-50">
                  View all developers →
                </Link>
              </div>
            </div>
          </div>
          <AccountLink />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15 text-white transition hover:border-gold-400 hover:text-gold-300 lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-navy-900 px-4 py-4 shadow-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className="rounded-lg px-3 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:text-gold-300"
              >
                {link.label}
              </Link>
            ))}
            <div className="rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setDevelopersOpen((value) => !value)}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-3 text-left text-base font-semibold text-white transition hover:bg-white/10 hover:text-gold-300"
                aria-expanded={developersOpen}
              >
                Developers <ChevronDown size={18} className={`transition ${developersOpen ? "rotate-180" : ""}`} />
              </button>
              {developersOpen && (
                <div className="max-h-80 overflow-y-auto border-t border-white/10 p-2">
                  {developers.length ? developers.map((developer) => (
                    <Link
                      key={developer.id}
                      href={`/developers/${developer.slug}`}
                      onClick={closeMenus}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-gold-300"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                        {developer.logoUrl ? <img src={developer.logoUrl} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-xs font-bold text-navy-900">{developer.name.charAt(0)}</span>}
                      </span>
                      <span className="min-w-0 truncate">{developer.name}</span>
                    </Link>
                  )) : (
                    <p className="px-3 py-3 text-sm text-white/70">Developer pages are being updated.</p>
                  )}
                  <Link href="/developers" onClick={closeMenus} className="mt-1 block rounded-lg px-3 py-3 text-sm font-bold text-gold-300 hover:bg-white/10">
                    View all developers →
                  </Link>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 pt-3">
              <AccountLink />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
