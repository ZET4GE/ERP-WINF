-- Fase 11 — Configuración, roles y auditoría ligera

-- ============================================================
-- CONFIGURACIÓN DE LA EMPRESA (fila única)
-- ============================================================

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'WINF',
  cuit text,
  contact_phone text,
  contact_email text,
  domain text,
  logo_url text,
  default_billing_day integer not null default 1 check (default_billing_day between 1 and 28),
  default_currency text not null default 'ARS' check (default_currency in ('ARS', 'USD')),
  updated_at timestamptz not null default now()
);

insert into public.company_settings (name) values ('WINF');

alter table public.company_settings enable row level security;

-- ============================================================
-- ROLES: admin ve todo, técnico sin finanzas
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create policy "staff read company settings" on public.company_settings
  for select using (public.is_staff());
create policy "admin insert company settings" on public.company_settings
  for insert with check (public.is_admin());
create policy "admin update company settings" on public.company_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- Un admin puede además editar cualquier perfil (asignar roles); un técnico
-- sigue pudiendo editar únicamente el suyo por la policy ya existente.
create policy "admin update any profile" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Tablas de finanzas y facturación: solo admin (técnico "sin finanzas").
drop policy "staff full access" on public.contracts;
create policy "admin full access" on public.contracts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.contract_items;
create policy "admin full access" on public.contract_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.installments;
create policy "admin full access" on public.installments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.subscription_charges;
create policy "admin full access" on public.subscription_charges
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.documents;
create policy "admin full access" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.document_counters;
create policy "admin full access" on public.document_counters
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.expense_categories;
create policy "admin full access" on public.expense_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.recurring_expenses;
create policy "admin full access" on public.recurring_expenses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy "staff full access" on public.transactions;
create policy "admin full access" on public.transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- El trigger de alta de usuario respeta el rol pasado en los metadatos
-- (usado al invitar un técnico); si no viene o es inválido, cae en 'admin'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'tecnico')
        then new.raw_user_meta_data ->> 'role'
      else 'admin'
    end
  );
  return new;
end;
$$;

-- ============================================================
-- AUDITORÍA LIGERA: created_by/updated_by en tablas críticas
-- ============================================================

alter table public.clients
  add column created_by uuid references public.profiles (id) on delete set null,
  add column updated_by uuid references public.profiles (id) on delete set null;

alter table public.contracts
  add column created_by uuid references public.profiles (id) on delete set null,
  add column updated_by uuid references public.profiles (id) on delete set null;

alter table public.documents
  add column created_by uuid references public.profiles (id) on delete set null,
  add column updated_by uuid references public.profiles (id) on delete set null;

alter table public.tickets
  add column created_by uuid references public.profiles (id) on delete set null,
  add column updated_by uuid references public.profiles (id) on delete set null;

-- ============================================================
-- STORAGE: logo de la empresa (bucket público, solo staff escribe)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "staff insert logos bucket" on storage.objects
  for insert with check (bucket_id = 'logos' and public.is_staff());
create policy "staff update logos bucket" on storage.objects
  for update using (bucket_id = 'logos' and public.is_staff())
  with check (bucket_id = 'logos' and public.is_staff());
create policy "staff delete logos bucket" on storage.objects
  for delete using (bucket_id = 'logos' and public.is_staff());
