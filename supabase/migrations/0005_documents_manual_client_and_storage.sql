-- Fase 6 — datos de cliente manual para documentos "sin cliente" + bucket de Storage para PDFs

alter table public.documents
  add column manual_client_name text,
  add column manual_client_contact text,
  add column manual_client_address text;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "staff read documents bucket" on storage.objects
  for select using (bucket_id = 'documents' and public.is_staff());
create policy "staff insert documents bucket" on storage.objects
  for insert with check (bucket_id = 'documents' and public.is_staff());
create policy "staff update documents bucket" on storage.objects
  for update using (bucket_id = 'documents' and public.is_staff())
  with check (bucket_id = 'documents' and public.is_staff());
create policy "staff delete documents bucket" on storage.objects
  for delete using (bucket_id = 'documents' and public.is_staff());
