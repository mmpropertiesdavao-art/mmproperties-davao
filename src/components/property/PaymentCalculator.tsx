// src/components/property/PaymentCalculator.tsx
"use client";

import { useState } from "react";

interface PaymentCalculatorProps {
  price: number;
  defaultDownpaymentPercent?: number;
  className?: string;
}

/**
 * Standard amortizing loan formula:
 *   M = P * r(1+r)^n / ((1+r)^n - 1)
 * where P = principal, r = monthly interest rate, n = term in months.
 */
function monthlyPayment(principal: number, annualRatePercent: number, years: number): number {
  const r = annualRatePercent / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function PaymentCalculator({ price, defaultDownpaymentPercent = 20, className = "" }: PaymentCalculatorProps) {
  const [downpaymentPercent, setDownpaymentPercent] = useState(defaultDownpaymentPercent);
  const [annualRate, setAnnualRate] = useState(6.5); // typical PH bank housing loan rate, illustrative
  const [termYears, setTermYears] = useState(20);

  const downpaymentAmount = price * (downpaymentPercent / 100);
  const loanAmount = price - downpaymentAmount;
  const monthly = monthlyPayment(loanAmount, annualRate, termYears);

  return (
    <div className={`rounded-xl border border-navy-100 bg-white p-5 text-navy-900 shadow-sm ${className}`}>
      <h3 className="mb-4 text-lg font-semibold">Payment &amp; loan calculator</h3>

      <label className="mb-3 block text-sm">
        Downpayment: {downpaymentPercent}% (PHP {downpaymentAmount.toLocaleString("en-PH", { maximumFractionDigits: 0 })})
        <input
          type="range"
          min={10}
          max={50}
          step={5}
          value={downpaymentPercent}
          onChange={(e) => setDownpaymentPercent(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <label className="mb-3 block text-sm">
        Interest rate: {annualRate}% per year
        <input
          type="range"
          min={4}
          max={12}
          step={0.25}
          value={annualRate}
          onChange={(e) => setAnnualRate(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <label className="mb-4 block text-sm">
        Loan term: {termYears} years
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={termYears}
          onChange={(e) => setTermYears(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-600">Estimated monthly payment</p>
        <p className="text-2xl font-semibold">PHP {monthly.toLocaleString("en-PH", { maximumFractionDigits: 0 })}</p>
        <p className="mt-1 text-xs text-gray-500">
          Loan amount PHP {loanAmount.toLocaleString("en-PH", { maximumFractionDigits: 0 })} at {annualRate}% over {termYears} years.
          Estimate only — actual terms depend on the lender and buyer qualification.
        </p>
      </div>
    </div>
  );
}
