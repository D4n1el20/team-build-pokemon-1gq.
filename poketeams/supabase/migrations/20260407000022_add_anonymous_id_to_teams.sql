ALTER TABLE teams
ADD COLUMN anonymous_id TEXT;

CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID DEFAULT NULL, anon_id TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  anonymous_id TEXT,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  team_pokemon JSON[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.anonymous_id,
    t.name,
    t.created_at,
    array_agg(
      json_build_object(
        'id', tp.id,
        'team_id', tp.team_id,
        'pokemon_id', tp.pokemon_id,
        'nickname', tp.nickname,
        'level', tp.level,
        'ivs', tp.ivs,
        'evs', tp.evs,
        'moves', tp.moves,
        'ability', tp.ability,
        'item', tp.item,
        'name', tp.name,
        'types', tp.types,
        'base_stats', tp.base_stats,
        'image_url', tp.image_url
      )
    ) as team_pokemon
  FROM teams t
  LEFT JOIN team_pokemon tp ON t.id = tp.team_id
  WHERE (t.user_id = user_uuid OR t.anonymous_id = anon_id)
  GROUP BY t.id, t.user_id, t.anonymous_id, t.name, t.created_at
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_teams(UUID, TEXT) TO authenticated, anon;
