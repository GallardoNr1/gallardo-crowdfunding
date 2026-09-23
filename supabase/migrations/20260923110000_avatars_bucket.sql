-- 20260923110000_avatars_bucket
-- Bucket público `avatars` para la foto de cada espacio (tenants.avatar_url).
-- Las subidas y borrados los hace el servidor con service role (src/lib/tenant-avatar-server.ts);
-- el navegador solo lee por URL pública, así que no hacen falta políticas de escritura.

-- ── up ──────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública de los objetos del bucket (las URLs públicas ya lo permiten; esta política
-- cubre además listados/descargas vía API con la clave anon).
drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

-- ── down ────────────────────────────────────────────────────────────────────
-- drop policy if exists "public read avatars" on storage.objects;
-- delete from storage.objects where bucket_id = 'avatars';
-- delete from storage.buckets where id = 'avatars';
