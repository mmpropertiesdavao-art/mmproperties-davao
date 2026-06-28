"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AccountLink } from "@/components/auth/AccountLink";

const navLinks = [
  { href: "/search", label: "Search" },
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/compare", label: "Compare" },
  { href: "/matcher", label: "MM Pulse" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About Us" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-navy-800 bg-navy-900 text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4" onClick={() => setOpen(false)}>
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
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:text-gold-300"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-3">
              <AccountLink />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
