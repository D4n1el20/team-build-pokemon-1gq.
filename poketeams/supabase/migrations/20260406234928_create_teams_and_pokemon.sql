-- Create teams table
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_pokemon table
CREATE TABLE team_pokemon (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL,
  nickname TEXT,
  level INTEGER DEFAULT 50,
  ivs JSONB DEFAULT '{"hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31}',
  evs JSONB DEFAULT '{"hp": 0, "atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0}',
  moves TEXT[] DEFAULT '{}',
  ability TEXT,
  item TEXT
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_pokemon ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own teams" ON teams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own teams" ON teams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own teams" ON teams
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view pokemon in their teams" ON team_pokemon
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_pokemon.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pokemon in their teams" ON team_pokemon
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_pokemon.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pokemon in their teams" ON team_pokemon
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_pokemon.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete pokemon in their teams" ON team_pokemon
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_pokemon.team_id
      AND teams.user_id = auth.uid()
    )
  );
