# Davao Property Finder — Architecture & Planning

This document is the planning companion to the code in this repo. The system architecture diagram (client → API layer → PostGIS/Auth/Storage, with Mapbox and background jobs as supporting services) was shared separately in the conversation — this doc covers what the diagram doesn't: folder structure, API contracts, SEO/performance/deployment, and the build roadmap.

## 1. Why this stack

Next.js App Router server-renders every property and neighborhood page, which matters here specifically because this platform competes on long-tail organic search traffic ("house and lot in Catalunan Grande under 3M"), not just paid acquisition — a client-rendered SPA would lose most of that traffic. PostGIS is the actual differentiator over a generic listings site: "search this area" and radius search are first-class geospatial queries against a `geography(Point, 4326)` column, not client-side math over a flat JSON array. Supabase bundles Postgres, Auth, and Storage, which removes a lot of early infra work without locking the project out of plain Postgres later. Zustand holds filter/UI state synced to the URL (so searches are shareable and bookmarkable) while React Query owns server-state caching — keeping those two concerns separate avoids the common bug of stale cached results after a filter change.

## 2. Folder structure

```
davao-property-finder/
├── database/
│   ├── schema.sql              # full PostGIS schema
│   └── seed.sql                 # 10 neighborhoods, developers, named landmarks
├── docs/
│   └── ARCHITECTURE_AND_ROADMAP.md
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx        # home page
│   │   ├── search/page.tsx              # split-screen listings + map
│   │   ├── property/[slug]/page.tsx     # property detail page
│   │   ├── neighborhoods/[slug]/page.tsx
│   │   ├── compare/page.tsx
│   │   ├── matcher/page.tsx
│   │   ├── admin/listings/new/page.tsx        # friendly single-listing form + photo upload + geocoding
│   │   ├── admin/listings/import/page.tsx     # CSV bulk import
│   │   ├── api/
│   │   │   ├── properties/search/route.ts
│   │   │   ├── matcher/route.ts
│   │   │   ├── inquiries/route.ts
│   │   │   └── admin/properties/route.ts        # single-listing create
│   │   │   └── admin/properties/bulk/route.ts   # CSV batch create
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── property/   (PropertyCard, PaymentCalculator, DistanceToAmenities, InquiryForm)
│   │   ├── search/      (FilterBar, MapView)
│   │   └── compare/    (ComparisonTable)
│   ├── lib/
│   │   ├── postgis/queries.ts   # query builders: radius, bbox, polygon, combined-filter, distance-to
│   │   ├── seo/meta.ts            # metadata + JSON-LD generators
│   │   ├── mapbox/geocode.ts      # address → coordinates for the upload forms
│   │   ├── auth/requireRole.ts    # role gate for admin/agent routes
│   │   ├── supabase/server.ts
│   │   ├── supabase/client.ts     # browser client + photo upload helper
│   │   ├── slugify.ts
│   │   ├── notifications.ts
│   │   └── data.ts
│   └── types/property.ts
├── public/templates/listings-template.csv   # downloadable CSV template for bulk import
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

Not yet scaffolded in this pass (flagged for the next build iteration, per the "scaffold the skeleton, then keep building" approach): the `/account` pages (favorites, saved searches), the `/guides` content hub pages, the rest of the `/admin` dashboard (manage leads, manage agents, analytics — listing upload itself is now built), the written content-hub posts, and `PropertyGallery`/`AgentCard`/`ShareButtons`/`FavoriteButton` components. Also not yet built: `/api/properties/[id]`, `/api/neighborhoods`, `/api/favorites`, `/api/saved-searches`, `/api/inquiries/[id]`. These follow the same patterns already established (see `combinedFilterSearchQuery` and the inquiries route) and are straightforward to add — happy to build any of them out next.

## 3. API route inventory

| Route | Method | Purpose |
|---|---|---|
| `/api/properties/search` | GET | Combined-filter search (price, type, bedrooms, developer, etc.) — built |
| `/api/properties/search` | POST | "Search this area" polygon search — built |
| `/api/properties/[id]` | GET/PATCH/DELETE | Single property CRUD — not yet scaffolded |
| `/api/neighborhoods/[slug]` | GET | Neighborhood + nearby POIs + listings — handled inline in the page for now, extract to a route if mobile/external clients need it |
| `/api/inquiries` | POST | Create inquiry, routes to agent or admin — built |
| `/api/inquiries/[id]` | PATCH | Update lead status through the pipeline — not yet scaffolded |
| `/api/favorites` | GET/POST/DELETE | Not yet scaffolded |
| `/api/saved-searches` | GET/POST/DELETE | Not yet scaffolded |
| `/api/matcher` | POST | AI property matcher — built |
| `/api/admin/properties` | POST | Create one listing from the friendly upload form; geocodes the address server-side — built |
| `/api/admin/properties/bulk` | POST | CSV bulk import, up to 200 rows, per-row success/failure reporting — built |

## 4. PostGIS query patterns

All four core geospatial patterns (radius, bounding box, drawn-polygon, distance-to-amenity) plus the combined-filter search and full-text search are implemented in `src/lib/postgis/queries.ts` as parameterized query builders, used by the search and matcher routes. The combined-filter query uses the `"$n IS NULL OR ..."` pattern so every filter in the filter bar is optional without needing a different query per combination.

## 5. AI property matcher — design pattern

The matcher deliberately does not let the LLM freelance which properties exist. Budget, family size, preferred areas, and lifestyle tags are translated into hard SQL filters first (budget → a ±15% price band, family size → a minimum bedroom count via `ceil(familySize / 2)`, preferred areas → a neighborhood filter) and PostGIS returns a real shortlist. Only that shortlist — never the full catalog — gets sent to the LLM, with an explicit instruction to write a one-sentence match explanation using only the provided data. This keeps "why this matches" output grounded instead of risking hallucinated amenities or distances.

## 5b. Listing upload — design pattern

The two upload paths (`/admin/listings/new` for one-off entry, `/admin/listings/import` for CSV batches) both route through the same constraint: nobody filling out a form or a spreadsheet should ever be asked for latitude/longitude. `lib/mapbox/geocode.ts` resolves a typed address to coordinates server-side, biased toward Davao City so short inputs like "Lanang" resolve correctly instead of matching a same-named place elsewhere. The bulk import endpoint processes rows independently and reports per-row success/failure rather than failing the whole batch on one bad address — a real spreadsheet from an agent will have typos, and losing 99 good rows because of 1 bad one is a worse failure mode than a partial import with a clear error report. Both routes currently gate on `requireRole(["admin", "agent"])`, which checks the `users.role` column via a live Supabase session — this is a real check, not a stub, but ship rate-limiting on top of it before this is publicly reachable, since nothing currently throttles repeated submissions from an authenticated-but-malicious account.

## 6. SEO

Dynamic metadata and JSON-LD are centralized in `src/lib/seo/meta.ts`: `RealEstateListing` schema on property pages, `Place` schema on neighborhood pages, `Organization` on the homepage, and `BreadcrumbList` on both. `sitemap.ts` and `robots.ts` use the App Router's native conventions, pulling live property and neighborhood data so the sitemap never goes stale. `/admin` and `/account` are disallowed in robots.txt.

## 7. Performance targets (Lighthouse 95+/100/95+/95+)

Property and neighborhood pages are server-rendered (RSC), not shipped as client-side JSON dumps. The Mapbox map only mounts on `/search` and the property detail page — it's heavy and shouldn't load globally. The listings panel should be virtualized once catalog size grows past a couple hundred active listings (not yet implemented in this pass — flag for phase 2). Neighborhood pages are good ISR candidates since their content changes far less often than live listings.

## 8. Deployment (Vercel + Supabase)

1. Provision a Supabase project, enable the PostGIS extension, then run `database/schema.sql` followed by `database/seed.sql`.
2. Set environment variables in Vercel per `.env.example` — `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `ANTHROPIC_API_KEY`.
3. Connect the GitHub repo to Vercel with preview deployments per PR.
4. Set up a cron (Vercel Cron or a Supabase Edge Function) for sitemap regeneration, saved-search match notifications, and stale-listing flagging — once those features are built.
5. Point a custom domain at the deployment, then submit the sitemap to Google Search Console.
6. Add basic uptime/error monitoring (Vercel Analytics + Sentry) before public launch.

## 9. Roadmap: MVP vs. phase 2 vs. phase 3

A common failure mode for a brief this size is treating every listed feature as "MVP." The goal of v1 is to validate the core discovery loop — search → property page → inquiry — with real users and real listings, fast.

### MVP (ship first)
- Property search with core filters: barangay/neighborhood, price, property type, bedrooms/bathrooms
- Split-screen map + listings with basic clustering (polygon draw-search can follow)
- Property detail page: gallery, description, specs, price, payment calculator, agent info, inquiry form
- 5–10 neighborhood SEO pages for the highest-traffic areas, not all ten at once
- Inquiry system with the full 5-stage lead pipeline (New → Contacted → Interested → Viewing Scheduled → Closed)
- Basic admin: manage listings, manage leads
- Core SEO: dynamic meta tags, sitemap, robots.txt, JSON-LD on property + neighborhood pages
- Buyer accounts (favorites, basic profile); agents added manually by admin for v1

### Phase 2
- Full 10-neighborhood rollout + market trend charts
- Property comparison tool (already scaffolded in this pass, but plug in real data + the "add to compare" action from listing cards)
- Saved searches with email/SMS alerts on new matches
- AI property matcher (scaffolded — wire up the lifestyle-tag-to-radius-query join described in the matcher route's comments)
- Draw-search-area on the map, "search this area" on pan/zoom (also scaffolded — needs a debounced viewport-change handler on the search page)
- Self-serve agent/seller onboarding and listing submission
- Educational content hub (buying/investment/OFW/financing/comparison guides)
- Loan calculator with a full amortization schedule (current calculator gives the monthly payment; an amortization table is a natural extension)
- Video tours, virtual staging
- Admin analytics dashboard (traffic, lead conversion, top-performing listings)
- Developer/agency partner pages and featured placements (monetization)

### Phase 3 (growth/monetization, once traction is proven)
- Elasticsearch migration if full-text/relevance search outgrows Postgres FTS
- Native mobile app
- Paid lead generation for agents/developers
- Mortgage/financing partner integrations
- Multi-city expansion beyond Davao, re-templating the neighborhood/landmark data pattern established here

## 10. Market-specific notes baked into this build

OFWs are a large, distinct buyer segment in Philippine real estate who often buy remotely with a local family member coordinating viewings — the `is_ofw` flag on `users` and `is_remote_buyer` on `inquiries`, plus the checkbox in `InquiryForm`, exist specifically so the agent-facing lead view can surface and prioritize this case rather than treating every lead identically. Barangay is a real, meaningful administrative unit in the Philippines, not a generic "district" label, so it's a first-class filter and column rather than folded into the neighborhood entity. Foreclosed properties are a distinct, popular category in the PH market (often bank-acquired), so `is_foreclosed` is a denormalized boolean on `properties` for a fast single-column filter, separate from the property-type taxonomy.
