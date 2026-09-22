-- Agrega el estado "cancelado" a documentos (presupuestos/comprobantes emitidos
-- por error o dados de baja), habilitando su posterior eliminación desde la app
-- (borrador y cancelado son los únicos estados que se pueden borrar).

alter table public.documents drop constraint documents_status_check;
alter table public.documents add constraint documents_status_check
  check (status in ('borrador', 'enviado', 'aceptado', 'cancelado', 'vencido'));
