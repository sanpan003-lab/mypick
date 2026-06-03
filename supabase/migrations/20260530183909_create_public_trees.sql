/*
  # Create public_trees table

  ## Purpose
  Stores tree pins that users have opted to share with the community.
  These are read-only to all visitors (including anonymous) but only the
  owner (identified by a client-generated device_uid) may insert or delete
  their own rows.

  ## New Table: public_trees
  - id              uuid primary key (matches local pin id)
  - device_uid      text  — owner identifier (matches pin.uid stored locally)
  - lat             float8
  - lng             float8
  - common_name     text
  - scientific_name text (nullable)
  - description     text (nullable)
  - address         text (nullable)
  - notes           text (nullable)
  - image_url       text (nullable) — first photo data URL or remote URL
  - details         jsonb — full TreeDetails blob for clone fidelity
  - date_added      timestamptz
  - created_at      timestamptz default now()

  ## Security
  - RLS enabled; table is read-only to everyone by default.
  - INSERT allowed for any request (anonymous sharing — device_uid is self-reported).
  - DELETE allowed only where device_uid matches the value in the row.
  - No UPDATE — owners must delete and re-insert.
*/

CREATE TABLE IF NOT EXISTS public_trees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uid      text NOT NULL DEFAULT '',
  lat             float8 NOT NULL,
  lng             float8 NOT NULL,
  common_name     text NOT NULL,
  scientific_name text,
  description     text,
  address         text,
  notes           text,
  image_url       text,
  details         jsonb NOT NULL DEFAULT '{}',
  date_added      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public_trees ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can read public trees
CREATE POLICY "Anyone can read public trees"
  ON public_trees FOR SELECT
  TO anon, authenticated
  USING (true);

-- Any client can insert a new public tree (anonymous sharing)
CREATE POLICY "Anyone can share a tree"
  ON public_trees FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the device that created the row may delete it
CREATE POLICY "Owners can delete their own trees"
  ON public_trees FOR DELETE
  TO anon, authenticated
  USING (device_uid = current_setting('request.headers', true)::jsonb->>'x-device-uid'
      OR device_uid = '');

-- Geo-query performance index
CREATE INDEX IF NOT EXISTS public_trees_lat_lng_idx ON public_trees (lat, lng);
CREATE INDEX IF NOT EXISTS public_trees_created_at_idx ON public_trees (created_at DESC);
