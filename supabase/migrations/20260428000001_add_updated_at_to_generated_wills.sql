alter table public.generated_wills
  add column if not exists updated_at timestamptz default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger generated_wills_updated_at
  before update on public.generated_wills
  for each row execute function public.set_updated_at();
