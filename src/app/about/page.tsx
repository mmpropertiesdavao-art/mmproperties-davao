import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, FileText, Handshake, Home, Landmark, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "About MM Properties",
  description:
    "Learn how MM Properties guides buyers, sellers, and investors through Davao City real estate decisions.",
};

const goals = [
  "Help buyers find the right property that fits their budget and long-term goals.",
  "Help sellers market and sell their properties with confidence and transparency.",
  "Help investors identify opportunities that make sense in the Davao City market.",
];

export default function AboutPage() {
  return (
    <main className="bg-white">
      <section className="bg-navy-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-gold-300">
            About Us
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
            Honest Davao real estate guidance — not pressure.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-navy-100">
            Whether you're buying your first home, selling a property you've owned for years, or investing for your family's future, you deserve clear advice from a team that understands the local market.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-3 font-bold text-navy-950">
              Browse properties <ArrowRight size={18} />
            </Link>
            <Link href="/apply" className="rounded-lg border border-white/30 px-5 py-3 font-bold text-white hover:border-gold-300 hover:text-gold-300">
              Sell or collaborate
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1fr_360px]">
        <article className="space-y-5 text-base leading-8 text-navy-700">
          <h2 className="text-3xl font-bold text-navy-950">About MM Properties</h2>

          <p>
            Real estate is one of the biggest financial decisions you'll ever make. Whether you're buying your first home, selling a property you've owned for years, or investing for your family's future, you deserve honest advice—not pressure.
          </p>

          <p>
            At MM Properties, we've been helping buyers, sellers, and investors since 2018. We've experienced the highs and lows of the real estate industry firsthand, and those experiences have taught us that every property transaction comes with real challenges.
          </p>

          <p>
            We've worked with clients who struggled with home loan approvals, financing requirements, property documentation, title transfers, taxes, and the many unexpected delays that can happen along the way. We've also helped property owners who didn't know how to price or market their properties, and investors who wanted to make the right decision without costly mistakes.
          </p>

          <p className="font-semibold text-navy-900">
            That's why we don't just help you find or sell a property—we guide you through the entire process.
          </p>

          <h2 className="pt-4 text-2xl font-bold text-navy-950">Our Goal</h2>

          <ul className="space-y-3">
            {goals.map((goal) => (
              <li key={goal} className="flex gap-3">
                <BadgeCheck className="mt-1 shrink-0 text-gold-600" size={20} />
                <span>{goal}</span>
              </li>
            ))}
          </ul>

          <p>
            We believe real estate shouldn't be confusing. We explain every step clearly—from financing and bank or Pag-IBIG requirements to documentation, title transfer, and ownership processing—so you always know what's happening and what comes next.
          </p>

          <p>
            As a Davao City-focused real estate team, we understand the local market, neighborhoods, pricing trends, and opportunities because this is where we work and build relationships every day.
          </p>

          <p>
            Since 2018, one thing has remained the same: we treat every client's property journey as if it were our own. Whether you're buying, selling, or investing, we're here to make the process smoother, more transparent, and far less stressful.
          </p>

          <p className="rounded-2xl bg-gold-50 p-5 font-semibold text-navy-900">
            Your property goals matter to us, and we're committed to helping you make informed decisions with confidence—every step of the way.
          </p>
        </article>

        <aside className="space-y-4">
          <InfoCard icon={<Home />} title="Buyers" text="Find homes, condos, lots, and investment options that fit your budget and long-term plans." />
          <InfoCard icon={<Handshake />} title="Sellers" text="Price, market, and present your property with confidence and transparency." />
          <InfoCard icon={<Landmark />} title="Investors" text="Identify Davao City opportunities with local context and smarter comparison tools." />
          <InfoCard icon={<FileText />} title="Guidance" text="Get clearer support around financing, requirements, documentation, title transfer, and ownership processing." />
          <InfoCard icon={<MapPin />} title="Davao-first" text="We focus on the neighborhoods, pricing trends, and real local details that matter in Davao City." />
        </aside>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="text-gold-700">{icon}</div>
      <h3 className="mt-3 font-bold text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-navy-500">{text}</p>
    </div>
  );
}
