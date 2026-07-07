-- Supabase RLS hardening for MM Properties public lookup/matching tables.
--
-- Run this in the Supabase SQL Editor.
--
-- Notes:
-- - public.spatial_ref_sys is a PostGIS system/reference table, so this migration
--   intentionally does not modify it.
-- - Places/alias tables are public lookup data used by search, neighborhoods,
--   map pins, and MM Pulse. Visitors can read them, but cannot insert/update/delete.
-- - matcher_events stores visitor interaction/matching telemetry. It should be
--   written through server-side API code only, not directly by browser clients.

begin;

alter table if exists public.places enable row level security;
alter table if exists public.place_aliases enable row level security;
alter table if exists public.property_places enable row level security;
alter table if exists public.developer_aliases enable row level security;
alter table if exists public.matcher_events enable row level security;

-- Public lookup tables: allow browser/client reads.
drop policy if exists "Public read places" on public.places;
create policy "Public read places"
on public.places
for select
to anon, authenticated
using (true);

drop policy if exists "Public read place aliases" on public.place_aliases;
create policy "Public read place aliases"
on public.place_aliases
for select
to anon, authenticated
using (true);

drop policy if exists "Public read property places" on public.property_places;
create policy "Public read property places"
on public.property_places
for select
to anon, authenticated
using (true);

drop policy if exists "Public read developer aliases" on public.developer_aliases;
create policy "Public read developer aliases"
on public.developer_aliases
for select
to anon, authenticated
using (true);

-- Make the intended privileges explicit.
grant select on public.places to anon, authenticated;
grant select on public.place_aliases to anon, authenticated;
grant select on public.property_places to anon, authenticated;
grant select on public.developer_aliases to anon, authenticated;

revoke insert, update, delete on public.places from anon, authenticated;
revoke insert, update, delete on public.place_aliases from anon, authenticated;
revoke insert, update, delete on public.property_places from anon, authenticated;
revoke insert, update, delete on public.developer_aliases from anon, authenticated;

-- matcher_events: no public direct access.
-- Server-side routes should write events using the database/service connection.
drop policy if exists "Public read matcher events" on public.matcher_events;
drop policy if exists "Public insert matcher events" on public.matcher_events;
drop policy if exists "Authenticated read matcher events" on public.matcher_events;
drop policy if exists "Authenticated insert matcher events" on public.matcher_events;

revoke all on public.matcher_events from anon, authenticated;

commit;
