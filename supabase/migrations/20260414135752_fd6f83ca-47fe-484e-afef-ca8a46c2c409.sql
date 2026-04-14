
-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fields/Campi table
CREATE TABLE public.fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  google_maps_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Misters table
CREATE TABLE public.misters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  access_code TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  mister_id UUID REFERENCES public.misters(id) ON DELETE SET NULL,
  opponent TEXT NOT NULL,
  field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  notes TEXT,
  score_home INTEGER,
  score_away INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sessions table for persistent login (athletes and misters)
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_type TEXT NOT NULL CHECK (session_type IN ('athlete', 'mister')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  category TEXT,
  device_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read, no restrictions needed (public data)
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete categories" ON public.categories FOR DELETE USING (true);

-- Fields: everyone can read
CREATE POLICY "Anyone can read fields" ON public.fields FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fields" ON public.fields FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fields" ON public.fields FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete fields" ON public.fields FOR DELETE USING (true);

-- Misters: everyone can read (for login verification), staff manages
CREATE POLICY "Anyone can read misters" ON public.misters FOR SELECT USING (true);
CREATE POLICY "Anyone can insert misters" ON public.misters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update misters" ON public.misters FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete misters" ON public.misters FOR DELETE USING (true);

-- Matches: everyone can read
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update matches" ON public.matches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete matches" ON public.matches FOR DELETE USING (true);

-- Sessions: everyone can manage (needed for login flow)
CREATE POLICY "Anyone can read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sessions" ON public.sessions FOR DELETE USING (true);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial categories
INSERT INTO public.categories (name, sort_order) VALUES
  ('2011', 1), ('2012', 2), ('2013', 3), ('2014', 4), ('2015', 5),
  ('2016', 6), ('2017', 7), ('2018', 8), ('2019', 9), ('2020/21', 10);
