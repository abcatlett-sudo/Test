create table if not exists public.generated_wills (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) not null,
  product_type text not null,
  testator_key text not null default 'primary',
  will_text    text not null,
  created_at   timestamptz default now(),
  unique(user_id, product_type, testator_key)
);

alter table public.generated_wills enable row level security;

create policy "Users can view own wills"
  on public.generated_wills for select to authenticated
  using (user_id = auth.uid());

create policy "Service role can insert wills"
  on public.generated_wills for insert
  with check (true);

create policy "Service role can update wills"
  on public.generated_wills for update
  using (true);
