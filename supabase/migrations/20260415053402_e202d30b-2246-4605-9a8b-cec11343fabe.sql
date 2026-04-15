
-- Add LIVE match columns to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS current_minute integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_second integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_period integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_interval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS match_start_time timestamptz DEFAULT null;

-- Create standings table
CREATE TABLE public.standings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  championship_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read standings" ON public.standings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert standings" ON public.standings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update standings" ON public.standings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete standings" ON public.standings FOR DELETE USING (true);

-- Create standings_entries table
CREATE TABLE public.standings_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  standings_id uuid NOT NULL REFERENCES public.standings(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  played integer NOT NULL DEFAULT 0,
  won integer NOT NULL DEFAULT 0,
  drawn integer NOT NULL DEFAULT 0,
  lost integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  goal_difference integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.standings_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read standings_entries" ON public.standings_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert standings_entries" ON public.standings_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update standings_entries" ON public.standings_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete standings_entries" ON public.standings_entries FOR DELETE USING (true);

-- Create opponent_teams table (teams by category)
CREATE TABLE public.opponent_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opponent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read opponent_teams" ON public.opponent_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can insert opponent_teams" ON public.opponent_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update opponent_teams" ON public.opponent_teams FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete opponent_teams" ON public.opponent_teams FOR DELETE USING (true);

-- Enable realtime for live match updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
