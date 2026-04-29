create table if not exists public.vouchers (
  id             uuid default gen_random_uuid() primary key,
  code           text not null unique,
  product_type   text not null,
  purchaser_email text not null,
  status         text not null default 'unused',
  redeemed_by    uuid references auth.users(id),
  redeemed_at    timestamptz,
  expires_at     timestamptz not null,
  created_at     timestamptz default now()
);

alter table public.vouchers enable row level security;

create policy "Service role manages all vouchers"
  on public.vouchers for all
  using (true)
  with check (true);
