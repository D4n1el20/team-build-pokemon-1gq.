ALTER TABLE team_pokemon
ADD COLUMN name TEXT,
ADD COLUMN types TEXT[],
ADD COLUMN base_stats JSONB,
ADD COLUMN image_url TEXT;
