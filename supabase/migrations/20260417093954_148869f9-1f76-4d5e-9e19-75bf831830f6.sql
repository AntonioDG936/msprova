
-- =====================================================
-- 1. ALTRE SQUADRE: colonne su matches
-- =====================================================
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_other_teams BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_team TEXT;

-- =====================================================
-- 2. IMPOSTAZIONI TEMPI DEFAULT PER CATEGORIA
-- =====================================================
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS default_period_duration INTEGER NOT NULL DEFAULT 25;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS default_total_periods INTEGER NOT NULL DEFAULT 2;

-- =====================================================
-- 3. TABELLE FASI FINALI
-- =====================================================
CREATE TABLE IF NOT EXISTS public.final_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'quarters', -- 'quarters' | 'semifinals' | 'final'
  period_duration INTEGER NOT NULL DEFAULT 25,
  total_periods INTEGER NOT NULL DEFAULT 2,
  has_triangolare BOOLEAN NOT NULL DEFAULT false,
  triangolare_mode TEXT, -- 'round_robin' | 'winner_passes'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'completed'
  winner_team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.final_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read final_phases" ON public.final_phases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert final_phases" ON public.final_phases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update final_phases" ON public.final_phases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete final_phases" ON public.final_phases FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.final_phase_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.final_phases(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  seed_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.final_phase_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read final_phase_teams" ON public.final_phase_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can insert final_phase_teams" ON public.final_phase_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update final_phase_teams" ON public.final_phase_teams FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete final_phase_teams" ON public.final_phase_teams FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.final_phase_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.final_phases(id) ON DELETE CASCADE,
  round TEXT NOT NULL, -- 'quarters' | 'semifinals' | 'final' | 'triangolare'
  slot INTEGER NOT NULL DEFAULT 0,
  team_home TEXT,
  team_away TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  winner TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.final_phase_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read final_phase_matches" ON public.final_phase_matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert final_phase_matches" ON public.final_phase_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update final_phase_matches" ON public.final_phase_matches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete final_phase_matches" ON public.final_phase_matches FOR DELETE USING (true);

-- =====================================================
-- 4. FUNZIONE: ricalcola classifica per categoria
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalculate_standings_for_category(p_category_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_standing_id UUID;
  v_cat_name TEXT;
  m RECORD;
  team_rec RECORD;
  v_home TEXT;
  v_away TEXT;
BEGIN
  -- trova o crea standing
  SELECT id INTO v_standing_id FROM public.standings WHERE category_id = p_category_id LIMIT 1;
  IF v_standing_id IS NULL THEN
    SELECT name INTO v_cat_name FROM public.categories WHERE id = p_category_id;
    INSERT INTO public.standings (category_id, championship_name)
    VALUES (p_category_id, COALESCE('Torneo ' || v_cat_name, 'Torneo'))
    RETURNING id INTO v_standing_id;
  END IF;

  -- tabella temporanea per accumulare le statistiche
  CREATE TEMP TABLE IF NOT EXISTS tmp_stats (
    team_name TEXT PRIMARY KEY,
    played INT DEFAULT 0,
    won INT DEFAULT 0,
    drawn INT DEFAULT 0,
    lost INT DEFAULT 0,
    goals_for INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    points INT DEFAULT 0
  ) ON COMMIT DROP;
  DELETE FROM tmp_stats;

  -- Inserisci tutte le squadre della categoria (opponent_teams) a 0
  FOR team_rec IN SELECT name FROM public.opponent_teams WHERE category_id = p_category_id LOOP
    INSERT INTO tmp_stats (team_name) VALUES (team_rec.name) ON CONFLICT DO NOTHING;
  END LOOP;
  -- Aggiungi sempre Napoli Campania
  INSERT INTO tmp_stats (team_name) VALUES ('Napoli Campania') ON CONFLICT DO NOTHING;

  -- Itera tutte le partite completed con punteggi
  FOR m IN
    SELECT * FROM public.matches
    WHERE category_id = p_category_id
      AND score_home IS NOT NULL
      AND score_away IS NOT NULL
  LOOP
    IF m.is_other_teams THEN
      v_home := COALESCE(m.home_team, '');
      v_away := COALESCE(m.opponent, '');
    ELSE
      v_home := 'Napoli Campania';
      v_away := COALESCE(m.opponent, '');
    END IF;

    IF v_home = '' OR v_away = '' THEN CONTINUE; END IF;

    INSERT INTO tmp_stats (team_name) VALUES (v_home) ON CONFLICT DO NOTHING;
    INSERT INTO tmp_stats (team_name) VALUES (v_away) ON CONFLICT DO NOTHING;

    UPDATE tmp_stats SET
      played = played + 1,
      goals_for = goals_for + m.score_home,
      goals_against = goals_against + m.score_away,
      won = won + CASE WHEN m.score_home > m.score_away THEN 1 ELSE 0 END,
      drawn = drawn + CASE WHEN m.score_home = m.score_away THEN 1 ELSE 0 END,
      lost = lost + CASE WHEN m.score_home < m.score_away THEN 1 ELSE 0 END,
      points = points
        + CASE WHEN m.score_home > m.score_away THEN 3
               WHEN m.score_home = m.score_away THEN 1 ELSE 0 END
    WHERE team_name = v_home;

    UPDATE tmp_stats SET
      played = played + 1,
      goals_for = goals_for + m.score_away,
      goals_against = goals_against + m.score_home,
      won = won + CASE WHEN m.score_away > m.score_home THEN 1 ELSE 0 END,
      drawn = drawn + CASE WHEN m.score_away = m.score_home THEN 1 ELSE 0 END,
      lost = lost + CASE WHEN m.score_away < m.score_home THEN 1 ELSE 0 END,
      points = points
        + CASE WHEN m.score_away > m.score_home THEN 3
               WHEN m.score_away = m.score_home THEN 1 ELSE 0 END
    WHERE team_name = v_away;
  END LOOP;

  -- Cancella vecchie entries e re-inserisci ordinate
  DELETE FROM public.standings_entries WHERE standings_id = v_standing_id;

  INSERT INTO public.standings_entries
    (standings_id, team_name, position, points, played, won, drawn, lost, goals_for, goals_against, goal_difference)
  SELECT
    v_standing_id,
    team_name,
    ROW_NUMBER() OVER (ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC, team_name)::INT,
    points, played, won, drawn, lost, goals_for, goals_against,
    (goals_for - goals_against)
  FROM tmp_stats;
END;
$$;

-- =====================================================
-- 5. TRIGGER: ricalcola automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_recalculate_standings_on_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_standings_for_category(OLD.category_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_standings_for_category(NEW.category_id);
    -- se cambia categoria, ricalcola anche la vecchia
    IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      PERFORM public.recalculate_standings_for_category(OLD.category_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS matches_recalc_standings ON public.matches;
CREATE TRIGGER matches_recalc_standings
AFTER INSERT OR UPDATE OF score_home, score_away, status, opponent, home_team, is_other_teams, category_id OR DELETE
ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_standings_on_match();

-- =====================================================
-- 6. TRIGGER: aggiungi squadra in classifica al volo
-- =====================================================
CREATE OR REPLACE FUNCTION public.trg_recalculate_standings_on_opponent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_standings_for_category(OLD.category_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_standings_for_category(NEW.category_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS opponent_teams_recalc_standings ON public.opponent_teams;
CREATE TRIGGER opponent_teams_recalc_standings
AFTER INSERT OR UPDATE OR DELETE
ON public.opponent_teams
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_standings_on_opponent();

-- =====================================================
-- 7. updated_at triggers
-- =====================================================
DROP TRIGGER IF EXISTS update_final_phases_updated_at ON public.final_phases;
CREATE TRIGGER update_final_phases_updated_at
BEFORE UPDATE ON public.final_phases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_final_phase_matches_updated_at ON public.final_phase_matches;
CREATE TRIGGER update_final_phase_matches_updated_at
BEFORE UPDATE ON public.final_phase_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. Realtime per le nuove tabelle
-- =====================================================
ALTER TABLE public.final_phases REPLICA IDENTITY FULL;
ALTER TABLE public.final_phase_teams REPLICA IDENTITY FULL;
ALTER TABLE public.final_phase_matches REPLICA IDENTITY FULL;
ALTER TABLE public.standings_entries REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.final_phases; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.final_phase_teams; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.final_phase_matches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.standings_entries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matches; EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;
