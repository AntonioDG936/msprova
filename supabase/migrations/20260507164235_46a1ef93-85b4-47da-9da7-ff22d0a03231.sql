ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_home_pen integer,
  ADD COLUMN IF NOT EXISTS score_away_pen integer,
  ADD COLUMN IF NOT EXISTS napoli_is_home boolean;