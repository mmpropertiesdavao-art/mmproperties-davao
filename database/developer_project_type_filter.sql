-- Adds project type metadata so /search?propertyType=condominium can include
-- matching developer projects as well as direct brokerage listings.

alter table public.developer_projects
  add column if not exists project_type text;

alter table public.developer_projects
  drop constraint if exists developer_projects_project_type_check;

alter table public.developer_projects
  add constraint developer_projects_project_type_check
  check (
    project_type is null
    or project_type in ('condominium','house-and-lot','lot-only','townhouse','commercial','mixed-use')
  );

create index if not exists idx_developer_projects_project_type
  on public.developer_projects(project_type)
  where project_type is not null;

-- Conservative backfill. You can still correct any project type manually
-- in Admin > Developer inventory after this runs.
update public.developer_projects
set project_type = 'condominium'
where project_type is null
  and (
    project_name ilike '%condo%'
    or project_name ilike '%tower%'
    or project_name ilike '%towers%'
  );

update public.developer_projects p
set project_type = 'lot-only'
where p.project_type is null
  and exists (
    select 1
    from public.developer_house_models m
    where m.project_id = p.id
      and m.active = true
      and m.model_type = 'lot_only'
  )
  and not exists (
    select 1
    from public.developer_house_models m
    where m.project_id = p.id
      and m.active = true
      and m.model_type <> 'lot_only'
  );

update public.developer_projects p
set project_type = 'house-and-lot'
where p.project_type is null
  and exists (
    select 1
    from public.developer_house_models m
    where m.project_id = p.id
      and m.active = true
      and m.model_type = 'house_model'
  );
