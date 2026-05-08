-- =====================================================================
-- RLS audit — read-only diagnostic.
-- Paste into Supabase SQL editor and run. Nothing is mutated.
--
-- Goal: surface tables in the `public` schema that are unprotected by RLS
-- or have RLS enabled but no policies (so they silently deny everything,
-- which is also a bug).
-- =====================================================================

-- 1) Tables in public — RLS state and policy count.
--    rls_enabled=false → ANYONE with a JWT can read/write.  Critical.
--    rls_enabled=true  but policy_count=0 → no one can read; usually unintended.
SELECT
  c.relname                                AS table_name,
  c.relrowsecurity                         AS rls_enabled,
  c.relforcerowsecurity                    AS rls_forced,
  COALESCE(p.policy_count, 0)              AS policy_count,
  CASE
    WHEN c.relrowsecurity = false                              THEN 'CRITICAL: RLS off — table is open'
    WHEN c.relrowsecurity = true  AND COALESCE(p.policy_count,0) = 0 THEN 'WARN: RLS on but no policies — denies all'
    ELSE 'ok'
  END                                      AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT schemaname, tablename, COUNT(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY schemaname, tablename
) p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'                       -- ordinary tables only
ORDER BY verdict DESC, c.relname;


-- 2) Per-policy detail (cmd, role, qual, with_check) — useful for spotting
--    write policies that allow `true` (open writes) or that forgot WITH CHECK.
SELECT
  schemaname,
  tablename,
  policyname,
  cmd                                       AS command,
  roles,
  CASE WHEN qual       IS NULL THEN 'NULL' ELSE qual       END AS using_clause,
  CASE WHEN with_check IS NULL THEN 'NULL' ELSE with_check END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- 3) SECURITY DEFINER functions in public — these run with the owner's
--    privileges and bypass RLS, so each one needs an in-body authorization
--    check (we do this in `manager_upsert_meal`). List them and review.
SELECT
  n.nspname  AS schema,
  p.proname  AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;


-- 4) Storage bucket policies (Supabase Storage) — make sure
--    `receipts` bucket has policies that scope by mess_id or user_id.
SELECT
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;

SELECT
  policyname       AS policy_name,
  cmd              AS command,
  roles,
  CASE WHEN qual       IS NULL THEN 'NULL' ELSE qual       END AS using_clause,
  CASE WHEN with_check IS NULL THEN 'NULL' ELSE with_check END AS with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
ORDER BY policyname;
