-- Audio bucket: students upload their own audio, teachers can read all
CREATE POLICY "Students upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Students read own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Service role (used server-side) bypasses RLS automatically
