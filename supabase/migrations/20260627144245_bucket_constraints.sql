-- Defense-in-depth upload constraints on the private incident-photos bucket.
-- The Slice-2 API route enforces caps primarily; these bucket-level limits are
-- a backstop independent of app code.
--   file_size_limit: 10 MB per object (citizen phone photos; resized to 768px)
--   allowed_mime_types: common phone image formats (HEIC for iPhone)
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'incident-photos';
