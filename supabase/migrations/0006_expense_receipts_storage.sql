-- Fase 8 — bucket de Storage para adjuntos (fotos de tickets) de gastos manuales

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "staff read receipts bucket" on storage.objects
  for select using (bucket_id = 'receipts' and public.is_staff());
create policy "staff insert receipts bucket" on storage.objects
  for insert with check (bucket_id = 'receipts' and public.is_staff());
create policy "staff update receipts bucket" on storage.objects
  for update using (bucket_id = 'receipts' and public.is_staff())
  with check (bucket_id = 'receipts' and public.is_staff());
create policy "staff delete receipts bucket" on storage.objects
  for delete using (bucket_id = 'receipts' and public.is_staff());
