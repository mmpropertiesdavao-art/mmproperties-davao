import { getPaymentReadiness } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

export default function PaymentReadinessPage() {
  const readiness = getPaymentReadiness();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Future integration</p>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900">GCash payment readiness</h1>
      <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Payments and collaborator subscriptions are currently disabled. The website will not collect money or restrict accounts based on payment.
      </div>

      <div className="mt-7 space-y-3 rounded-xl border border-navy-100 bg-white p-6">
        <ReadinessRow label="Payment system enabled" ready={readiness.paymentsEnabled} disabledLabel="Disabled as requested" />
        <ReadinessRow label="Selected provider" ready={readiness.provider === "gcash"} disabledLabel="None selected" readyLabel="GCash" />
        <ReadinessRow label="GCash merchant account" ready={readiness.gcash.merchantConfigured} disabledLabel="Not connected" />
        <ReadinessRow label="API and webhook credentials" ready={readiness.gcash.credentialsConfigured} disabledLabel="Not configured" />
      </div>

      <section className="mt-7 rounded-xl border border-navy-100 bg-white p-6">
        <h2 className="font-semibold text-navy-900">When you are ready</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-navy-600">
          <li>Obtain approved merchant/API credentials from GCash or its authorized acquiring partner.</li>
          <li>Add the server-only variables documented in <code>docs/GCASH_FUTURE_INTEGRATION.md</code>.</li>
          <li>Implement and test checkout, webhook verification, refunds, and reconciliation in a staging environment.</li>
          <li>Only then set <code>PAYMENTS_ENABLED=true</code>.</li>
        </ol>
      </section>
    </div>
  );
}

function ReadinessRow({ label, ready, disabledLabel, readyLabel = "Configured" }: { label: string; ready: boolean; disabledLabel: string; readyLabel?: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-navy-50 py-2 last:border-0"><span className="text-sm text-navy-700">{label}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>{ready ? readyLabel : disabledLabel}</span></div>;
}
