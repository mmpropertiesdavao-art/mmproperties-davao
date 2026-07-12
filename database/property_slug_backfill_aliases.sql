-- Safe slug backfill for existing listings.
--
-- Purpose:
-- - Keep old property URLs working through property_slug_aliases.
-- - Update existing listing slugs to a cleaner format: title + public_id.
-- - Future title edits should still keep slugs stable unless changed deliberately.
--
-- Run this once in Supabase SQL Editor after deploying the code that resolves
-- property_slug_aliases in getPropertyBySlug().

begin;

create table if not exists public.property_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  slug text not null unique,
  created_at timestamptz default now()
);

create index if not exists idx_property_slug_aliases_property_id
  on public.property_slug_aliases(property_id);

insert into public.property_slug_aliases(property_id, slug)
select p.id, p.slug
from public.properties p
where p.slug is not null
  and p.public_id is not null
on conflict (slug) do nothing;

with generated as (
  select
    p.id,
    lower(
      regexp_replace(
        regexp_replace(
          trim(
            regexp_replace(
              regexp_replace(
                lower(coalesce(nullif(p.title, ''), 'listing')),
                '[^a-z0-9]+',
                '-',
                'g'
              ),
              '(^-|-$)',
              '',
              'g'
            )
          ) || '-' || lower(regexp_replace(p.public_id, '[^a-z0-9]+', '-', 'g')),
          '-+',
          '-',
          'g'
        ),
        '(^-|-$)',
        '',
        'g'
      )
    ) as new_slug
  from public.properties p
  where p.public_id is not null
)
update public.properties p
set slug = generated.new_slug,
    updated_at = now()
from generated
where p.id = generated.id
  and generated.new_slug is not null
  and generated.new_slug <> ''
  and p.slug is distinct from generated.new_slug
  and not exists (
    select 1
    from public.properties other
    where other.slug = generated.new_slug
      and other.id <> p.id
  );

commit;
