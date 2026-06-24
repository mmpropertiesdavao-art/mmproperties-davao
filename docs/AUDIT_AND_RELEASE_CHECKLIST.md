# Audit and release checklist

Audit date: 20 June 2026

## What the audit found

- The project compiled, but Leaflet was evaluated by the production server and could throw `window is not defined` after deployment.
- All three current listings use the same Davao city-center fallback coordinate (`7.0731, 125.6128`). Their markers overlap, which makes the map appear to omit listings.
- Bulk import did not perform street-level geocoding. It mapped only a few neighborhood names and otherwise used the city center.
- `/guides` was linked in the header but had no route. The database table existed, but there was no publisher.
- Supabase Auth had role checks but no login interface, seller workspace, profile synchronization, or listing-ownership enforcement.
- Photo uploads were sequential, accepted unbounded files, and could leave partial uploads when a later file failed.
- The production build contacted Postgres while generating the sitemap, making deployment dependent on database network availability at build time.
- The homepage search field was sent to `/search` but ignored by the API.

## Improvements completed

- Leaflet maps now load only in the browser, resize correctly, fit listing bounds, and use visible price markers.
- Single, bulk, and existing listings have exact draggable/clickable Davao map pins.
- CSV import removes blank rows, validates every record, accepts optional `lat`/`lng`, offers a visual pin review, and reports row-level results.
- Existing imported listings can be corrected at `/admin/locations` without re-importing.
- Photo selection now validates type/size/count, de-duplicates, supports ordering, uploads concurrently, and rolls storage back on a failed batch.
- Server-side ownership checks restrict seller and agent listing/photo/location access.
- Public Guides, individual post pages, and an admin publisher support buyer, seller, neighborhood, and market updates.
- Seller/agent login and a protected partner dashboard are available.
- Supabase browser/server sessions now share cookies; `database/auth_setup.sql` synchronizes Auth users to application profiles.
- Property pages now show uploaded photos and the exact listing map.
- Public search uses the homepage term, and the sitemap/homepage no longer require Postgres during the build.
- The Supabase image host and public site URL are environment-driven.

## Required before production deployment

1. Back up the Supabase database.
2. Run `database/schema.sql` for a new database, then run `database/auth_setup.sql`. For an existing database, run only the reviewed incremental statements that are not already present, then run `auth_setup.sql`.
3. In Supabase Auth, create collaborator accounts and promote approved profiles with `UPDATE public.users SET role = 'seller'` or `role = 'agent'`. Never expose role selection in public signup.
4. Set all variables from `.env.example` in the hosting dashboard. Keep `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` server-only.
5. Open `/admin/locations` and replace the city-center pin for each of the three current listings. Exact coordinates cannot be safely guessed from text addresses.
6. Upload representative photos, publish one test guide, submit one inquiry, and test each approved role in a staging deployment.
7. Configure database backups, uptime/error monitoring, a Content Security Policy, and request rate limits before public promotion.
8. Replace placeholder neighborhood/market claims with verified Davao data and update the production `NEXT_PUBLIC_SITE_URL`.

## Verified locally

- `npm run build` completes with all routes.
- The production server starts without the previous Leaflet server crash.
- `/`, `/search`, `/guides`, and `/login` return HTTP 200.
- `/api/properties/search` connects to the configured database and returns all three current listings with coordinates.

## Operational limits

- OpenStreetMap tiles are suitable for early traffic, but public launch should follow the tile provider's usage policy or use a commercial tile provider.
- Address text alone is not reliable enough for Philippine property locations; exact pins remain the source of truth.
- Image transformation/compression is not performed during upload. Add a server-side image pipeline or Supabase image transformations when storage/bandwidth volume grows.
- Blog content is plain text with paragraph breaks. A rich-text editor, revisions, and scheduled publishing can be added later without changing the public URLs.
