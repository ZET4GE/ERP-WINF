-- Fase 2 — soft delete de clientes (se conservan si tienen contratos asociados)

alter table public.clients
  add column deleted_at timestamptz;

create index clients_deleted_at_idx on public.clients (deleted_at);
