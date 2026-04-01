-- Optional BRD governance and retrieval audit snapshots (JSONB).
-- Apply after Phase 2 AI metadata migration. Inserts degrade gracefully if omitted.

begin;

alter table public.brds
  add column if not exists ai_prompt_package_version text,
  add column if not exists brd_governance jsonb,
  add column if not exists brd_retrieval_execution jsonb;

commit;
