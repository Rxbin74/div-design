-- DIV Design — Schema SQL normalise (workspace unique)
-- Ce script est idempotent et inclut une migration depuis l'ancien blob JSON `divdesign_state`.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Utility functions
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.jwt_email()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_allowed_domain()
returns boolean language sql stable as $$
  select public.jwt_email() like '%@divprotocol.com'
$$;

-- ─────────────────────────────────────────────────────────────
-- Core normalized tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.app_settings (
  id            integer primary key default 1 check (id = 1),
  access_key    text not null default 'DIV-2026',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique not null,
  name          text not null,
  email         text unique not null,
  role          text not null default 'Membre' check (role in ('Admin','Design','Dev','Membre')),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.projects (
  id            text primary key,
  name          text not null,
  description   text,
  figma_link    text,
  color         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.versions (
  id            text primary key,
  project_id    text not null references public.projects(id) on delete cascade,
  number        text not null,
  title         text not null,
  description   text,
  figma_link    text,
  image         text,
  status        text not null default 'Brouillon',
  changelog     jsonb not null default '[]'::jsonb,
  author_id     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.comments (
  id            text primary key,
  version_id    text not null references public.versions(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  text          text not null,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.comment_replies (
  id            text primary key,
  comment_id    text not null references public.comments(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  text          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.roadmap_milestones (
  id            text primary key,
  project_id    text references public.projects(id) on delete set null,
  title         text not null,
  start_date    date,
  due_date      date not null,
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.notifications (
  id            text primary key,
  user_id       uuid references public.profiles(id) on delete cascade,
  text          text not null,
  read          boolean not null default false,
  type          text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_versions_project_id on public.versions(project_id);
create index if not exists idx_comments_version_id on public.comments(version_id);
create index if not exists idx_replies_comment_id on public.comment_replies(comment_id);
create index if not exists idx_roadmap_project_id on public.roadmap_milestones(project_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- updated_at triggers
drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists trg_versions_updated_at on public.versions;
create trigger trg_versions_updated_at before update on public.versions for each row execute function public.set_updated_at();
drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at before update on public.comments for each row execute function public.set_updated_at();
drop trigger if exists trg_comment_replies_updated_at on public.comment_replies;
create trigger trg_comment_replies_updated_at before update on public.comment_replies for each row execute function public.set_updated_at();
drop trigger if exists trg_roadmap_updated_at on public.roadmap_milestones;
create trigger trg_roadmap_updated_at before update on public.roadmap_milestones for each row execute function public.set_updated_at();
drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();

insert into public.app_settings(id, access_key)
values (1, 'DIV-2026')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Domain guard for profiles
-- ─────────────────────────────────────────────────────────────
create or replace function public.enforce_profile_domain()
returns trigger language plpgsql as $$
begin
  if lower(new.email) not like '%@divprotocol.com' then
    raise exception 'Only @divprotocol.com emails are allowed';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_domain_guard on public.profiles;
create trigger trg_profiles_domain_guard
before insert or update on public.profiles
for each row execute function public.enforce_profile_domain();

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'Admin'
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS policies
-- ─────────────────────────────────────────────────────────────
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.versions enable row level security;
alter table public.comments enable row level security;
alter table public.comment_replies enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.notifications enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['app_settings','profiles','projects','versions','comments','comment_replies','roadmap_milestones','notifications']) loop
    execute format('drop policy if exists "auth_select_%s" on public.%I', t, t);
    execute format('drop policy if exists "auth_modify_%s" on public.%I', t, t);
  end loop;
exception when undefined_table then null;
end $$;

create policy "auth_select_app_settings" on public.app_settings
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_app_settings" on public.app_settings
for all to authenticated
using (public.is_allowed_domain() and public.is_admin())
with check (public.is_allowed_domain() and public.is_admin());

create policy "auth_select_profiles" on public.profiles
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_profiles" on public.profiles
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_projects" on public.projects
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_projects" on public.projects
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_versions" on public.versions
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_versions" on public.versions
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_comments" on public.comments
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_comments" on public.comments
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_comment_replies" on public.comment_replies
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_comment_replies" on public.comment_replies
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_roadmap_milestones" on public.roadmap_milestones
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_roadmap_milestones" on public.roadmap_milestones
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

create policy "auth_select_notifications" on public.notifications
for select to authenticated using (public.is_allowed_domain());
create policy "auth_modify_notifications" on public.notifications
for all to authenticated
using (public.is_allowed_domain())
with check (public.is_allowed_domain());

-- ─────────────────────────────────────────────────────────────
-- Grants (required in addition to RLS policies)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.app_settings to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.versions to authenticated;
grant select, insert, update, delete on table public.comments to authenticated;
grant select, insert, update, delete on table public.comment_replies to authenticated;
grant select, insert, update, delete on table public.roadmap_milestones to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Migration from legacy JSON blob table `divdesign_state`
-- ─────────────────────────────────────────────────────────────
do $$
declare legacy jsonb;
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='divdesign_state') then
    select data into legacy from public.divdesign_state where id = 1;
    if legacy is not null then
      update public.app_settings
      set access_key = coalesce(legacy->>'accessKey', access_key)
      where id = 1;

      insert into public.profiles (id, auth_user_id, name, email, role, created_at)
      select
        gen_random_uuid(),
        gen_random_uuid(),
        coalesce(u->>'name', 'Utilisateur'),
        lower(coalesce(u->>'email', concat(gen_random_uuid()::text, '@divprotocol.com'))),
        case when coalesce(u->>'role','Membre') in ('Admin','Design','Dev','Membre') then u->>'role' else 'Membre' end,
        coalesce((u->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'users','[]'::jsonb)) u
      on conflict (email) do update
      set name = excluded.name,
          role = excluded.role,
          updated_at = now();

      insert into public.projects (id, name, description, figma_link, color, created_at)
      select
        p->>'id',
        coalesce(p->>'name','Projet'),
        p->>'description',
        p->>'figmaLink',
        p->>'color',
        coalesce((p->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'projects','[]'::jsonb)) p
      where p->>'id' is not null
      on conflict (id) do update
      set name = excluded.name,
          description = excluded.description,
          figma_link = excluded.figma_link,
          color = excluded.color,
          updated_at = now();

      insert into public.versions (id, project_id, number, title, description, figma_link, image, status, changelog, created_at)
      select
        v->>'id',
        p->>'id',
        coalesce(v->>'number','v0'),
        coalesce(v->>'title','Version'),
        v->>'description',
        v->>'figmaLink',
        v->>'image',
        coalesce(v->>'status','Brouillon'),
        coalesce(v->'changelog','[]'::jsonb),
        coalesce((v->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'projects','[]'::jsonb)) p,
           jsonb_array_elements(coalesce(p->'versions','[]'::jsonb)) v
      where v->>'id' is not null and p->>'id' is not null
      on conflict (id) do update
      set project_id = excluded.project_id,
          number = excluded.number,
          title = excluded.title,
          description = excluded.description,
          figma_link = excluded.figma_link,
          image = excluded.image,
          status = excluded.status,
          changelog = excluded.changelog,
          updated_at = now();

      insert into public.comments (id, version_id, text, resolved, created_at)
      select
        c->>'id',
        v->>'id',
        coalesce(c->>'text',''),
        coalesce((c->>'resolved')::boolean,false),
        coalesce((c->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'projects','[]'::jsonb)) p,
           jsonb_array_elements(coalesce(p->'versions','[]'::jsonb)) v,
           jsonb_array_elements(coalesce(v->'comments','[]'::jsonb)) c
      where c->>'id' is not null and v->>'id' is not null
      on conflict (id) do update
      set text = excluded.text,
          resolved = excluded.resolved,
          updated_at = now();

      insert into public.comment_replies (id, comment_id, text, created_at)
      select
        r->>'id',
        c->>'id',
        coalesce(r->>'text',''),
        coalesce((r->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'projects','[]'::jsonb)) p,
           jsonb_array_elements(coalesce(p->'versions','[]'::jsonb)) v,
           jsonb_array_elements(coalesce(v->'comments','[]'::jsonb)) c,
           jsonb_array_elements(coalesce(c->'replies','[]'::jsonb)) r
      where r->>'id' is not null and c->>'id' is not null
      on conflict (id) do update
      set text = excluded.text,
          updated_at = now();

      insert into public.roadmap_milestones (id, project_id, title, start_date, due_date, completed, created_at)
      select
        m->>'id',
        m->>'projectId',
        coalesce(m->>'title','Milestone'),
        nullif(m->>'startDate','')::date,
        coalesce(nullif(m->>'dueDate','')::date, now()::date),
        coalesce((m->>'completed')::boolean, false),
        coalesce((m->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'roadmap','[]'::jsonb)) m
      where m->>'id' is not null
      on conflict (id) do update
      set project_id = excluded.project_id,
          title = excluded.title,
          start_date = excluded.start_date,
          due_date = excluded.due_date,
          completed = excluded.completed,
          updated_at = now();

      insert into public.notifications (id, text, read, type, meta, created_at)
      select
        n->>'id',
        coalesce(n->>'text',''),
        coalesce((n->>'read')::boolean, false),
        n->>'type',
        coalesce(n->'meta','{}'::jsonb),
        coalesce((n->>'createdAt')::timestamptz, now())
      from jsonb_array_elements(coalesce(legacy->'notifications','[]'::jsonb)) n
      where n->>'id' is not null
      on conflict (id) do update
      set text = excluded.text,
          read = excluded.read,
          type = excluded.type,
          meta = excluded.meta,
          updated_at = now();
    end if;
  end if;
end $$;

-- Realtime publication
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    execute 'alter publication supabase_realtime add table public.app_settings';
    execute 'alter publication supabase_realtime add table public.profiles';
    execute 'alter publication supabase_realtime add table public.projects';
    execute 'alter publication supabase_realtime add table public.versions';
    execute 'alter publication supabase_realtime add table public.comments';
    execute 'alter publication supabase_realtime add table public.comment_replies';
    execute 'alter publication supabase_realtime add table public.roadmap_milestones';
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
exception when duplicate_object then null;
end $$;
