import { MultiStepLeadForm } from "@/components/leads/forms/MultiStepLeadForm";

export const metadata = {
  title: "Get a Free Property Valuation | MM Properties Davao",
  description: "Request a free property valuation for your Davao property from MM Properties.",
};

export default function SellerValuationPage() {
  return (
    <main className="bg-navy-50 px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-[.22em] text-gold-700">Seller lead form</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-navy-950 sm:text-5xl">Get a Free Property Valuation</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-navy-600">
            Planning to sell in Davao? Share the basics and MM Properties will help you understand your pricing, marketing, and buyer-fit options.
          </p>
        </section>
        <MultiStepLeadForm kind="seller" sourcePage="/seller-valuation" />
      </div>
    </main>
  );
}
