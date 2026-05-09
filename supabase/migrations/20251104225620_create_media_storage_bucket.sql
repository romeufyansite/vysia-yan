/*
  # Create Media Storage Bucket

  1. Storage
    - Create 'media' bucket for storing user uploaded files
    - Set bucket to public for easy access to media files
    - Add RLS policies for upload and delete operations

  2. Security
    - Users can only upload files to their org's folder
    - Users can only delete files from their org's folder
    - All files are publicly readable
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload media to their org folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update media in their org folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete media from their org folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view media files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');
