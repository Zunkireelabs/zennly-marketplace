-- Missing from the previous migration and discovered by actually testing, not by reading the
-- policies: the "avatars" bucket's public: true flag bypasses RLS for the direct public download
-- URL (/storage/v1/object/public/...), but the Storage API's own remove()/update()-by-path
-- operations go through an authenticated SELECT first to resolve which row to act on — with no
-- SELECT policy, that lookup finds nothing (remove() returned {data: [], error: null}, no error,
-- silently deleting zero rows) even for the object's own owner. Verified: without this policy, a
-- user's own avatar replace left the old object orphaned in storage despite the app reporting
-- success; with it, the same flow correctly deletes the previous object.
CREATE POLICY "avatars_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
