create table if not exists public.will_responses (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) not null,
  product_type text not null,
  responses    jsonb not null default '{}',
  current_step integer not null default 0,
  completed    boolean not null default false,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now(),
  unique(user_id, product_type)
);

alter table public.will_responses enable row level security;

create policy "Users can manage own responses"
  on public.will_responses for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function update_will_responses_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger will_responses_updated_at
  before update on public.will_responses
  for each row execute function update_will_responses_updated_at();
