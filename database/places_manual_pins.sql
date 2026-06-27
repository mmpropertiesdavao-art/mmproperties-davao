-- Manual map pins for curated places/neighborhood intelligence.
-- Safe to run more than once.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_places_location
  ON public.places USING GIST (location);
