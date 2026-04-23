-- ─────────────────────────────────────────────────────────────
-- DIV Design — Schéma Supabase
-- Approche simple : un document JSON unique pour l'état applicatif.
-- L'appli lit/écrit ce document et s'abonne aux changements en temps réel.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.divdesign_state (
  id           integer primary key,
  data         jsonb        not null default '{}'::jsonb,
  updated_at   timestamptz  not null default now()
);

-- Ligne unique
insert into public.divdesign_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_divdesign_state_updated_at on public.divdesign_state;
create trigger trg_divdesign_state_updated_at
  before update on public.divdesign_state
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Politique permissive pour le prototype. À durcir avant production
-- (ex: exiger auth.uid() via Supabase Auth, ou brancher Google OAuth).
-- ─────────────────────────────────────────────────────────────

alter table public.divdesign_state enable row level security;

drop policy if exists "anon read"   on public.divdesign_state;
drop policy if exists "anon write"  on public.divdesign_state;
drop policy if exists "anon update" on public.divdesign_state;

create policy "anon read"
  on public.divdesign_state
  for select
  to anon, authenticated
  using (true);

create policy "anon write"
  on public.divdesign_state
  for insert
  to anon, authenticated
  with check (true);

create policy "anon update"
  on public.divdesign_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────
-- Realtime : activer les events pour que le front reçoive les updates
-- (à vérifier aussi dans Supabase Studio → Database → Replication).
-- ─────────────────────────────────────────────────────────────

do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    execute 'alter publication supabase_realtime add table public.divdesign_state';
  end if;
exception when duplicate_object then null;
end $$;
