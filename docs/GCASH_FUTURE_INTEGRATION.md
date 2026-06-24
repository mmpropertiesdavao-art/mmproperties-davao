# Future GCash integration

GCash payments and collaborator subscriptions are intentionally disabled. The current release contains only a server-side configuration seam and an admin readiness page at `/admin/settings/payments`.

## Current guarantees

- No checkout is exposed to visitors or collaborators.
- No payment details are collected.
- No account or featured-listing access depends on payment.
- No placeholder endpoint can accidentally create a charge.
- Credentials remain server-only and are never returned to the browser.

## Future environment variables

```env
PAYMENTS_ENABLED=false
PAYMENT_PROVIDER=none
GCASH_MERCHANT_ID=
GCASH_API_KEY=
GCASH_WEBHOOK_SECRET=
```

Keep `PAYMENTS_ENABLED=false` and `PAYMENT_PROVIDER=none` until a real GCash merchant arrangement is approved and the complete integration has passed staging tests.

## Required implementation before activation

1. Confirm the API/acquiring partner and obtain its current official documentation.
2. Create server-only checkout and payment-status endpoints.
3. Verify signed webhooks before changing any subscription state.
4. Store payment references, amounts, currency, status, and reconciliation timestamps—never wallet credentials.
5. Make webhook processing idempotent so repeated callbacks cannot duplicate credits.
6. Add refund, dispute, expiration, grace-period, and failed-payment handling.
7. Test success, cancellation, timeout, duplicate webhook, invalid signature, and refund cases in staging.
8. Complete privacy-policy, terms, invoice/receipt, accounting, and customer-support requirements.

The provider integration should remain behind `src/lib/payments/config.ts`, allowing the rest of MM Properties to stay independent of a specific payment vendor.
