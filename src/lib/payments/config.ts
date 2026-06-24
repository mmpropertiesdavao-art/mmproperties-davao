export type PaymentProvider = "none" | "gcash";

/**
 * Server-only payment readiness configuration.
 * No payment code should read credentials directly outside this module.
 */
export function getPaymentReadiness() {
  const provider = normalizeProvider(process.env.PAYMENT_PROVIDER);
  const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";
  const gcashMerchantConfigured = Boolean(process.env.GCASH_MERCHANT_ID);
  const gcashCredentialsConfigured = Boolean(process.env.GCASH_API_KEY && process.env.GCASH_WEBHOOK_SECRET);

  return {
    paymentsEnabled,
    provider,
    gcash: {
      merchantConfigured: gcashMerchantConfigured,
      credentialsConfigured: gcashCredentialsConfigured,
      ready: provider === "gcash" && gcashMerchantConfigured && gcashCredentialsConfigured,
    },
  } as const;
}

function normalizeProvider(value: string | undefined): PaymentProvider {
  return value === "gcash" ? "gcash" : "none";
}
