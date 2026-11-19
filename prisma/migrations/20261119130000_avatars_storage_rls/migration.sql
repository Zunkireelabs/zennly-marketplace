-- RLS policies for the "avatars" Storage bucket (created separately via supabase-js's
-- storage.createBucket(), not here — bucket creation goes through the Storage API per
-- protect_buckets_delete's own signal that storage.buckets/storage.objects data isn't meant to be
-- manipulated directly; authoring RLS POLICIES on storage.objects, by contrast, is the standard,
-- Supabase-documented way to control storage access and has no supabase-js equivalent — this is
-- schema, not bucket data).
--
-- The bucket itself is public-read (storage.createBucket({ public: true })), so GET/download needs
-- no policy here. What needs enforcing is the other direction: a mistaken write/delete policy in a
-- public-read bucket is a real hole, since anyone can already read every object's URL.
--
-- Object keys are always "<userId>/<random>.webp" (src/lib/account/avatar-upload.ts), so
-- (storage.foldername(name))[1] is exactly the uploading user's own id for every legitimate
-- object — these policies restrict INSERT/UPDATE/DELETE to the object's own folder matching the
-- signed-in user's id, enforced by Postgres itself against the caller's JWT (auth.uid()), not by
-- application code that a future change could accidentally bypass.
CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
