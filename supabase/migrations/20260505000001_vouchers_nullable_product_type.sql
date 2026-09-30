-- Allow shared/corporate discount vouchers that apply to any product type,
-- and vouchers inserted without a specific purchaser email.
alter table public.vouchers alter column product_type   drop not null;
alter table public.vouchers alter column purchaser_email drop not null;
