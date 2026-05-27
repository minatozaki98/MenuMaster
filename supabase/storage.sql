insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read menu images" on storage.objects;
create policy "public read menu images"
on storage.objects for select
using (bucket_id = 'menu-images');

drop policy if exists "admin upload menu images" on storage.objects;
create policy "admin upload menu images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'menu-images');

drop policy if exists "admin update menu images" on storage.objects;
create policy "admin update menu images"
on storage.objects for update
to authenticated
using (bucket_id = 'menu-images')
with check (bucket_id = 'menu-images');

drop policy if exists "admin delete menu images" on storage.objects;
create policy "admin delete menu images"
on storage.objects for delete
to authenticated
using (bucket_id = 'menu-images');
