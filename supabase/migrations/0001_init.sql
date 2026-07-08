-- WINF ERP — Migración inicial (Fase 1)
-- Núcleo CRM, catálogo/contratos, stock serializado, documentos, agenda,
-- finanzas y soporte. RLS activada en todas las tablas.

create extension if not exists pgcrypto;

-- ============================================================
-- NÚCLEO CRM
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'tecnico')),
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  business_name text,
  dni text,
  cuit_cuil text,
  email text,
  phone text,
  address text,
  city text,
  province text not null default 'Córdoba',
  status text not null default 'potencial' check (status in ('activo', 'inactivo', 'moroso', 'potencial')),
  lat double precision,
  lng double precision,
  internal_notes text,
  created_at timestamptz not null default now()
);

create index clients_last_name_idx on public.clients (last_name);
create index clients_status_idx on public.clients (status);

-- ============================================================
-- CATÁLOGO Y CONTRATOS
-- ============================================================

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories (id) on delete restrict,
  name text not null,
  type text not null check (type in ('unico', 'recurrente')),
  base_price numeric(14, 2) not null default 0,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index services_category_id_idx on public.services (category_id);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null,
  status text not null default 'activo' check (status in ('activo', 'pausado', 'finalizado', 'cancelado')),
  start_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index contracts_client_id_idx on public.contracts (client_id);
create index contracts_status_idx on public.contracts (status);

-- contract_items: una fila por línea de contrato. Los campos usados
-- dependen de item_type (equipo_financiado / cargo_unico / suscripcion).
-- La FK a inventory_items se agrega más abajo, luego de crear esa tabla.
create table public.contract_items (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  item_type text not null check (item_type in ('equipo_financiado', 'cargo_unico', 'suscripcion')),
  service_id uuid references public.services (id) on delete set null,
  description text not null,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  -- equipo_financiado
  total_amount numeric(14, 2),
  down_payment numeric(14, 2) default 0,
  installments_count integer,
  inventory_item_id uuid,
  -- cargo_unico
  single_amount numeric(14, 2),
  -- suscripcion (subscription_breakdown: [{"label": "Plan Starlink", "amount": 45000}, ...])
  monthly_amount numeric(14, 2),
  subscription_breakdown jsonb,
  billing_day integer check (billing_day between 1 and 28),
  subscription_start_date date,
  created_at timestamptz not null default now()
);

create index contract_items_contract_id_idx on public.contract_items (contract_id);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  contract_item_id uuid not null references public.contract_items (id) on delete cascade,
  number integer not null,
  amount numeric(14, 2) not null,
  due_date date not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagada', 'vencida')),
  paid_at date,
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'mercadopago')),
  created_at timestamptz not null default now(),
  unique (contract_item_id, number)
);

create index installments_contract_item_id_idx on public.installments (contract_item_id);
create index installments_status_due_date_idx on public.installments (status, due_date);

create table public.subscription_charges (
  id uuid primary key default gen_random_uuid(),
  contract_item_id uuid not null references public.contract_items (id) on delete cascade,
  period date not null, -- primer día del mes del período, ej. 2026-07-01
  amount numeric(14, 2) not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagada', 'vencida')),
  paid_at date,
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'mercadopago')),
  created_at timestamptz not null default now(),
  unique (contract_item_id, period)
);

create index subscription_charges_contract_item_id_idx on public.subscription_charges (contract_item_id);
create index subscription_charges_status_idx on public.subscription_charges (status);

-- ============================================================
-- STOCK SERIALIZADO
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  cost numeric(14, 2) default 0,
  sale_price numeric(14, 2) default 0,
  min_stock_threshold integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  serial_number text not null unique,
  manufacturer_number text,
  status text not null default 'en_stock' check (status in ('en_stock', 'asignado', 'instalado', 'rma', 'baja')),
  client_id uuid references public.clients (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index inventory_items_serial_number_idx on public.inventory_items (serial_number);
create index inventory_items_status_idx on public.inventory_items (status);
create index inventory_items_client_id_idx on public.inventory_items (client_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  from_status text,
  to_status text not null,
  client_id uuid references public.clients (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index inventory_movements_inventory_item_id_idx on public.inventory_movements (inventory_item_id);

alter table public.contract_items
  add constraint contract_items_inventory_item_id_fkey
  foreign key (inventory_item_id) references public.inventory_items (id) on delete set null;

-- ============================================================
-- DOCUMENTOS
-- ============================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('presupuesto', 'informe_tecnico', 'remito_ot', 'comprobante')),
  number text unique,
  client_id uuid references public.clients (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete set null,
  issued_at date not null default current_date,
  valid_until date,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  status text not null default 'borrador' check (status in ('borrador', 'enviado', 'aceptado', 'vencido')),
  items jsonb not null default '[]'::jsonb,
  body text,
  notes text,
  subtotal numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index documents_client_id_idx on public.documents (client_id);
create index documents_doc_type_idx on public.documents (doc_type);
create index documents_status_idx on public.documents (status);

create table public.document_counters (
  doc_type text primary key,
  prefix text not null,
  last_number integer not null default 0
);

insert into public.document_counters (doc_type, prefix) values
  ('presupuesto', 'PRE'),
  ('informe_tecnico', 'INF'),
  ('remito_ot', 'OT'),
  ('comprobante', 'COMP');

create or replace function public.generate_document_number(p_doc_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next integer;
begin
  update public.document_counters
    set last_number = last_number + 1
    where doc_type = p_doc_type
    returning prefix, last_number into v_prefix, v_next;

  if v_prefix is null then
    raise exception 'Tipo de documento desconocido: %', p_doc_type;
  end if;

  return v_prefix || '-' || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function public.set_document_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null then
    new.number := public.generate_document_number(new.doc_type);
  end if;
  return new;
end;
$$;

create trigger trg_set_document_number
  before insert on public.documents
  for each row execute function public.set_document_number();

-- ============================================================
-- AGENDA
-- ============================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete set null,
  type text not null check (type in ('instalacion', 'soporte', 'relevamiento', 'mantenimiento')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'confirmado', 'completado', 'cancelado')),
  technician_id uuid references public.profiles (id) on delete set null,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_start_at_idx on public.appointments (start_at);

-- ============================================================
-- FINANZAS
-- ============================================================

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.expense_categories (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete cascade,
  amount numeric(14, 2) not null,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index recurring_expenses_contract_id_idx on public.recurring_expenses (contract_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ingreso', 'egreso')),
  origin text not null check (origin in ('cuota', 'suscripcion', 'cargo_unico', 'venta', 'gasto_manual', 'gasto_recurrente')),
  installment_id uuid references public.installments (id) on delete set null,
  subscription_charge_id uuid references public.subscription_charges (id) on delete set null,
  document_id uuid references public.documents (id) on delete set null,
  recurring_expense_id uuid references public.recurring_expenses (id) on delete set null,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount numeric(14, 2) not null,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  date date not null default current_date,
  description text,
  attachment_url text,
  created_at timestamptz not null default now()
);

create index transactions_date_idx on public.transactions (date);
create index transactions_type_idx on public.transactions (type);

-- ============================================================
-- SOPORTE
-- ============================================================

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  subject text not null,
  description text,
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta', 'urgente')),
  status text not null default 'abierto' check (status in ('abierto', 'en_proceso', 'resuelto', 'cerrado')),
  solution_applied text,
  time_spent_minutes integer,
  created_at timestamptz not null default now()
);

create index tickets_client_id_idx on public.tickets (client_id);
create index tickets_status_idx on public.tickets (status);

create table public.ticket_updates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index ticket_updates_ticket_id_idx on public.ticket_updates (ticket_id);

-- ============================================================
-- AUTH: trigger que crea profile al registrarse
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'admin');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS: solo usuarios autenticados con profile acceden
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_items enable row level security;
alter table public.installments enable row level security;
alter table public.subscription_charges enable row level security;
alter table public.products enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.documents enable row level security;
alter table public.document_counters enable row level security;
alter table public.appointments enable row level security;
alter table public.expense_categories enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_updates enable row level security;

create policy "staff read own profile or any if staff" on public.profiles
  for select using (public.is_staff());
create policy "staff update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "staff full access" on public.clients
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.service_categories
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.services
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.contracts
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.contract_items
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.installments
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.subscription_charges
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.products
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.inventory_items
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.inventory_movements
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.documents
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.document_counters
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.appointments
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.expense_categories
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.recurring_expenses
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.transactions
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.tickets
  for all using (public.is_staff()) with check (public.is_staff());
create policy "staff full access" on public.ticket_updates
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- SEEDS
-- ============================================================

insert into public.service_categories (name) values
  ('Starlink'),
  ('Redes'),
  ('Cámaras'),
  ('Mantenimiento'),
  ('Venta de equipos'),
  ('Configuraciones');

insert into public.expense_categories (name) values
  ('Materiales'),
  ('Equipos'),
  ('Combustible'),
  ('Herramientas'),
  ('Servicios'),
  ('Otros');
