-- Disable RLS for anonymous access (temporary solution for demo)
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_pokemon DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anonymous users
GRANT ALL ON teams TO anon;
GRANT ALL ON team_pokemon TO anon;
GRANT USAGE ON SCHEMA public TO anon;
