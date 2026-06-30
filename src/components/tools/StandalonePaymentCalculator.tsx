"use client";

import { useMemo, useState } from "react";

function monthlyPayment(principal: number, annualRatePercent: number, years: number) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const months = years * 12;
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

function peso(value: number) {
  return `PHP ${Math.round(value).toLocaleString("en-PH")}`;
}

export function StandalonePaymentCalculator() {
  const [price, setPrice] = useState(5_000_000);
  const [downpaymentPercent, setDownpaymentPercent] = useState(20);
  const [annualRate, setAnnualRate] = useState(6.5);
  const [termYears, setTermYears] = useState(20);

  const result = useMemo(() => {
    const downpayment = price * (downpaymentPercent / 100);
    const loanAmount = Math.max(0, price - downpayment);
    const monthly = monthlyPayment(loanAmount, annualRate, termYears);
    return { downpayment, loanAmount, monthly };
  }, [price, downpaymentPercent, annualRate, termYears]);

  return (
    <section className="rounded-3xl border border-navy-100 bg-white p-4 shadow-xl shadow-navy-900/5 sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Field label="Property price">
            <input
              type="number"
              min={100_000}
              step={100_000}
              value={price}
              onChange={(event) => setPrice(Math.max(0, Number(event.target.value) || 0))}
              className="min-h-12 w-full rounded-xl border border-navy-200 px-4 py-3 text-lg font-bold text-navy-900 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-100"
            />
          </Field>

          <Slider label={`Downpayment: ${downpaymentPercent}% (${peso(result.downpayment)})`} min={5} max={60} step={5} value={downpaymentPercent} onChange={setDownpaymentPercent} />
          <Slider label={`Interest rate: ${annualRate}% per year`} min={3} max={15} step={0.25} value={annualRate} onChange={setAnnualRate} />
          <Slider label={`Loan term: ${termYears} years`} min={1} max={30} step={1} value={termYears} onChange={setTermYears} />
        </div>

        <aside className="rounded-2xl bg-navy-900 p-5 text-white sm:p-6">
          <p className="text-sm font-bold uppercase tracking-widest text-gold-300">Estimated monthly payment</p>
          <p className="mt-3 text-4xl font-black tracking-tight">{peso(result.monthly)}</p>
          <div className="mt-6 space-y-3 text-sm text-navy-100">
            <Row label="Property price" value={peso(price)} />
            <Row label="Downpayment" value={peso(result.downpayment)} />
            <Row label="Loan amount" value={peso(result.loanAmount)} />
            <Row label="Interest / term" value={`${annualRate}% · ${termYears} years`} />
          </div>
          <p className="mt-6 rounded-xl bg-white/10 p-3 text-xs leading-5 text-navy-100">
            Estimate only. Actual bank, Pag-IBIG, in-house, or assume-balance terms depend on lender approval, buyer qualification, fees, taxes, and the property’s final contract terms.
          </p>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-navy-800">{label}</span>
      {children}
    </label>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-2xl border border-navy-100 bg-navy-50 p-4">
      <span className="block text-sm font-bold text-navy-800">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-gold-500" />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 last:border-0">
      <span>{label}</span>
      <span className="text-right font-bold text-white">{value}</span>
    </div>
  );
}
