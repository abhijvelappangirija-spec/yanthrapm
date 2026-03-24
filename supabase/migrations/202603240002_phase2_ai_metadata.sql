-- Phase 2 provider abstraction: AI generation metadata audit columns
-- Apply after the base schema and Phase 1 RLS migration.

begin;

alter table public.brds
  add column if not exists ai_provider text,
  add column if not exists ai_model text,
  add column if not exists ai_task text,
  add column if not exists ai_is_external boolean,
  add column if not exists ai_generated_at timestamptz;

alter table public.sprints
  add column if not exists ai_provider text,
  add column if not exists ai_model text,
  add column if not exists ai_task text,
  add column if not exists ai_is_external boolean,
  add column if not exists ai_generated_at timestamptz;

create index if not exists idx_brds_ai_generated_at
  on public.brds (ai_generated_at desc);

create index if not exists idx_sprints_ai_generated_at
  on public.sprints (ai_generated_at desc);

commit;
