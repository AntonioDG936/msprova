CREATE OR REPLACE FUNCTION public.recalculate_standings_for_category(p_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_standing_id UUID;
  v_cat_name TEXT;
  m RECORD;
  team_rec RECORD;
  v_home TEXT;
  v_away TEXT;
BEGIN
  SELECT id INTO v_standing_id FROM public.standings WHERE category_id = p_category_id LIMIT 1;
  IF v_standing_id IS NULL THEN
    SELECT name INTO v_cat_name FROM public.categories WHERE id = p_category_id;
    INSERT INTO public.standings (category_id, championship_name)
    VALUES (p_category_id, COALESCE('Torneo ' || v_cat_name, 'Torneo'))
    RETURNING id INTO v_standing_id;
  END IF;

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
  TRUNCATE TABLE tmp_stats;

  FOR team_rec IN SELECT name FROM public.opponent_teams WHERE category_id = p_category_id LOOP
    INSERT INTO tmp_stats (team_name) VALUES (team_rec.name) ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO tmp_stats (team_name) VALUES ('Napoli Campania') ON CONFLICT DO NOTHING;

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
$function$;