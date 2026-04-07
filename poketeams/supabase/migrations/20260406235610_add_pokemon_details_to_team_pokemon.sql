-- Add additional Pokemon details to team_pokemon table for faster loading
ALTER TABLE team_pokemon
ADD COLUMN name TEXT,
ADD COLUMN types TEXT[],
ADD COLUMN base_stats JSONB,
ADD COLUMN image_url TEXT;
