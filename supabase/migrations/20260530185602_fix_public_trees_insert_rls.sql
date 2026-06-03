/*
  # Fix public_trees INSERT RLS policy

  ## Problem
  The previous "Anyone can share a tree" INSERT policy used `WITH CHECK (true)`,
  which is always-true and effectively bypasses row-level security.

  ## Fix
  Replace it with a policy that requires every inserted row to carry a non-empty
  `device_uid`. This ensures:
  - Every row has a traceable owner identity (the stable per-device UUID the
    client generates and stores in localStorage).
  - Rows with a blank or null device_uid are rejected at the database level.
  - The DELETE policy (which also matches on device_uid) remains coherent —
    only rows that were inserted with a real device_uid can ever be deleted.

  No other policies are changed.
*/

DROP POLICY IF EXISTS "Anyone can share a tree" ON public_trees;

CREATE POLICY "Anyone can share a tree with a valid device_uid"
  ON public_trees FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    device_uid IS NOT NULL
    AND length(trim(device_uid)) > 0
  );
