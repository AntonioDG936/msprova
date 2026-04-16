
-- Create match_events table
CREATE TABLE public.match_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'goal',
  minute INTEGER NOT NULL DEFAULT 0,
  second INTEGER NOT NULL DEFAULT 0,
  period INTEGER NOT NULL DEFAULT 1,
  player_name TEXT,
  team TEXT NOT NULL DEFAULT 'home',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read match_events" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert match_events" ON public.match_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update match_events" ON public.match_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete match_events" ON public.match_events FOR DELETE USING (true);

-- Add columns to matches for period settings
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS period_duration INTEGER DEFAULT 25;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS total_periods INTEGER DEFAULT 2;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS stoppage_minutes INTEGER;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
