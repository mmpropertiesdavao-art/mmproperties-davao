# Davao Property Finder

Find the Right Property in Davao City — a consumer-first property discovery platform, not a simple listing site.

## What's in this repo

This is a working scaffold, not a finished production app: the database schema, the geospatial search/matcher API logic, and the highest-leverage pages and components are built out in full; some pages reference components or routes flagged as "not yet scaffolded" in `docs/ARCHITECTURE_AND_ROADMAP.md` (admin dashboard, account pages, the written content-hub posts themselves, agent onboarding). That split is deliberate — see the roadmap doc for what's MVP vs. phase 2 vs. phase 3, and ask for any specific piece to be built out next.

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase connection string, Mapbox token, and Anthropic API key.
2. Provision a Supabase (or any Postgres 15+) database, then run:
   ```
   psql $DATABASE_URL -f database/schema.sql
   psql $DATABASE_URL -f database/seed.sql
   ```
3. Create a public `property-images` bucket in Supabase Storage (used by the listing upload pages — see `docs/DEPLOYMENT_GUIDE.md` step 1 for the exact policy setup).
4. Install dependencies and run the dev server:
   ```
   npm install
   npm run dev
   ```

## Adding listings

Two ways to build out your listing database without touching SQL:
- `/admin/listings/new` — a single-listing form with photo upload and automatic address-to-map-pin geocoding.
- `/admin/listings/import` — CSV bulk import (up to 200 rows per batch) for getting an existing spreadsheet of listings in quickly. Download the template from that page for the expected column format.

Both routes are gated to `admin`/`agent` roles via `lib/auth/requireRole.ts` — see that file's comment for what's still a starting pattern vs. production-ready.

## Deployment

See `docs/DEPLOYMENT_GUIDE.md` for the full Supabase + GitHub + Hostry walkthrough, including the realistic VPS-based path for Hostry specifically (it isn't a git-push Next.js platform like Vercel).

## Project structure

See `docs/ARCHITECTURE_AND_ROADMAP.md` for the full folder tree, API route inventory, PostGIS query patterns, SEO/performance/deployment notes, and the MVP/phase-2/phase-3 roadmap. See `docs/CONTENT_HUB.md` for the educational content plan, and `docs/DESIGN_SYSTEM.md` for the navy/gold color system and where it's applied so far.

## Notes on the seed data

`database/seed.sql` includes illustrative neighborhood overviews, advantage/disadvantage lists, and average price-per-sqm figures for the 10 launch neighborhoods (Lanang, Buhangin, Matina, Maa, Bajada, Ecoland, Talomo, Toril, Catalunan Grande, Catalunan Pequeño). These are clearly placeholder content for demo purposes — replace with verified local market data before relying on them for real decisions.
