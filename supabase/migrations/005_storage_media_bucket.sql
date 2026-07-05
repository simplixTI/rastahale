-- ============================================================
--  005_storage_media_bucket.sql
--  Cria o bucket "media" (usado por VideoFormModal para upload de
--  thumbnails/vídeos) e as políticas de acesso. Sem isso, qualquer
--  upload de arquivo falha porque o bucket não existe.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Leitura pública (thumbnails/vídeos precisam ser exibidos para qualquer aluno)
drop policy if exists "media_read_public" on storage.objects;
create policy "media_read_public" on storage.objects
  for select using (bucket_id = 'media');

-- Upload: apenas admin ou instrutor autenticado
drop policy if exists "media_insert_admin_instructor" on storage.objects;
create policy "media_insert_admin_instructor" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'instructor')
    )
  );

-- Update/Delete: apenas admin ou instrutor autenticado
drop policy if exists "media_update_admin_instructor" on storage.objects;
create policy "media_update_admin_instructor" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'instructor')
    )
  );

drop policy if exists "media_delete_admin_instructor" on storage.objects;
create policy "media_delete_admin_instructor" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text in ('admin', 'instructor')
    )
  );
