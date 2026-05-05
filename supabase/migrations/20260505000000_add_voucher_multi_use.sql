-- Add multi-use voucher support
-- max_uses: maximum number of times a voucher can be redeemed (default 1 = single use)
-- use_count: running total of successful redemptions

alter table public.vouchers
  add column if not exists max_uses  integer not null default 1,
  add column if not exists use_count integer not null default 0;
