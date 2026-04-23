-- Purchases table — records completed Stripe payments.
-- Populated by the stripe-webhook edge function.
-- Linked to auth.users by email after the customer creates their account.

create table if not exists public.purchases (
  id                uuid        default gen_random_uuid() primary key,
  stripe_session_id text        unique not null,
  email             text        not null,
  product_id        text        not null,
  amount            integer     not null,          -- pence (GBP)
  status            text        not null default 'pending',
  user_id           uuid        references auth.users(id),
  created_at        timestamptz default now()
);

alter table public.purchases enable row level security;

-- Authenticated users can read their own purchase records (matched by email)
create policy "Users can view own purchases"
  on public.purchases
  for select
  to authenticated
  using (lower(email) = lower(auth.email()));
