-- Per-area schemas. Each calculator owns its tables.
create schema if not exists retirement;
create schema if not exists home;
create schema if not exists budget;
create schema if not exists chat;

-- Shared helper used by *_updated_at triggers below
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
