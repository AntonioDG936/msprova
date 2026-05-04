-- Estendi matches per supportare partite delle fasi finali
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_final_phase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_phase_id uuid REFERENCES public.final_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS final_phase_round text,
  ADD COLUMN IF NOT EXISTS final_phase_slot integer;

-- Permetti che le partite delle fasi finali siano create senza opponent rigido (già nullable home_team / opponent può restare)
-- Indice per lookup rapido
CREATE INDEX IF NOT EXISTS idx_matches_final_phase ON public.matches(final_phase_id);

-- Aggiungi modalità "round_of_16" (ottavi) - non serve enum, è text
-- Aggiorna final_phases.mode per accettare 'round_of_16': è text, non serve constraint change.

-- Permetti che opponent sia nullable per match TBD delle fasi finali
ALTER TABLE public.matches ALTER COLUMN opponent DROP NOT NULL;