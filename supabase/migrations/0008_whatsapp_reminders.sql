-- Fase 12 — Recordatorios automáticos por WhatsApp (turno mañana, cuota por vencer)

create table public.whatsapp_reminders (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('turno', 'cuota')),
  reference_table text not null check (reference_table in ('appointments', 'installments', 'subscription_charges')),
  reference_id uuid not null,
  client_id uuid not null references public.clients (id) on delete cascade,
  status text not null default 'pendiente'
    check (status in ('enviado', 'error', 'sin_telefono', 'sin_configurar')),
  message text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reference_table, reference_id)
);

create index whatsapp_reminders_client_id_idx on public.whatsapp_reminders (client_id);

alter table public.whatsapp_reminders enable row level security;

-- Igual que el resto de tablas de finanzas/facturación (Fase 11): solo admin,
-- porque expone montos de cuotas además de datos de contacto del cliente.
create policy "admin full access" on public.whatsapp_reminders
  for all using (public.is_admin()) with check (public.is_admin());
