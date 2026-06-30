import type { Metadata } from "next";
import Link from "next/link";
import { StandalonePaymentCalculator } from "@/components/tools/StandalonePaymentCalculator";

export const metadata: Metadata = {
  title: "Payment Calculator | MM Properties",
  description: "Estimate monthly payments for Davao property purchases using price, downpayment, interest rate, and loan term.",
};

export default function PaymentCalculatorPage() {
  return (
    <main className="bg-slate-50 px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <nav className="text-sm text-navy-500">
          <Link href="/" className="hover:text-gold-700">Home</Link>
          <span className="px-2">/</span>
          <span>Payment calculator</span>
        </nav>

        <section className="mt-6 rounded-3xl bg-navy-900 px-5 py-8 text-white sm:px-8 lg:px-10">
          <p className="text-sm font-bold uppercase tracking-widest text-gold-300">Buyer tool</p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">Davao property payment calculator</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-navy-100 sm:text-lg">
            Use this simple calculator to estimate monthly payments before talking to a bank, Pag-IBIG, developer, or seller. It is designed for quick education—not final loan approval.
          </p>
        </section>

        <div className="mt-8">
          <StandalonePaymentCalculator />
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Info title="What this helps with" text="Estimate affordability before you inquire, compare properties, or choose between bank, Pag-IBIG, in-house, or assume-balance options." />
          <Info title="What is not included" text="Taxes, transfer costs, MRI/fire insurance, association dues, reservation fees, and lender-specific charges are not included yet." />
          <Info title="Best next step" text="Use this estimate as a starting point, then confirm the exact terms with your lender, developer, seller, or MM Properties." />
        </section>
      </div>
    </main>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5">
      <h2 className="font-bold text-navy-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-navy-600">{text}</p>
    </div>
  );
}
