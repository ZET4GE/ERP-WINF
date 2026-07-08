-- Fase 5 — agrega moneda al catálogo de productos (guardar siempre moneda + monto)
alter table public.products
  add column currency text not null default 'ARS' check (currency in ('ARS', 'USD'));
