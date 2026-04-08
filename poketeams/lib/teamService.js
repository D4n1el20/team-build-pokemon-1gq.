import { supabase } from './supabase'

async function getRequiredUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) throw new Error('AUTH_REQUIRED')

  return user
}

function mapPokemonInsert(teamId, pokemon) {
  return {
    team_id: teamId,
    pokemon_id: pokemon.id,
    nickname: pokemon.nickname || null,
    level: pokemon.level || 50,
    ivs: pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: pokemon.moves || [],
    ability: pokemon.ability || null,
    item: pokemon.item || null,
    name: pokemon.name,
    types: pokemon.types,
    base_stats: pokemon.stats,
    image_url: pokemon.image
  }
}

export const teamService = {
  // Create a new team
  async createTeam(teamName, pokemonList) {
    const user = await getRequiredUser()

    const { data, error } = await supabase
      .from('teams')
      .insert([
        {
          user_id: user.id,
          name: teamName
        }
      ])
      .select()
      .single()

    if (error) throw error

    const teamId = data.id
    const pokemonInserts = pokemonList.map((pokemon) => mapPokemonInsert(teamId, pokemon))

    if (pokemonInserts.length > 0) {
      const { error: pokemonError } = await supabase
        .from('team_pokemon')
        .insert(pokemonInserts)

      if (pokemonError) throw pokemonError
    }

    return data
  },

  // Get logged user teams
  async getUserTeams() {
    const user = await getRequiredUser()

    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        user_id,
        name,
        created_at,
        team_pokemon (
          id,
          team_id,
          pokemon_id,
          nickname,
          level,
          ivs,
          evs,
          moves,
          ability,
          item,
          name,
          types,
          base_stats,
          image_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((team) => ({
      ...team,
      team_pokemon: (team.team_pokemon || []).filter(Boolean)
    }))
  },

  // Update a team
  async updateTeam(teamId, teamName, pokemonList) {
    const user = await getRequiredUser()

    // 1) Update the team name
    const { data: updatedTeam, error: teamError } = await supabase
      .from('teams')
      .update({ name: teamName })
      .eq('id', teamId)
      .eq('user_id', user.id)
      .select('id, name')
      .single()

    if (teamError) throw teamError

    // 2) Remove old pokemon from this team
    const { error: deleteError } = await supabase
      .from('team_pokemon')
      .delete()
      .eq('team_id', teamId)

    if (deleteError) throw deleteError

    // 3) Insert the updated pokemon list
    const pokemonInserts = pokemonList.map((pokemon) => mapPokemonInsert(teamId, pokemon))

    if (pokemonInserts.length > 0) {
      const { error: pokemonError } = await supabase
        .from('team_pokemon')
        .insert(pokemonInserts)

      if (pokemonError) throw pokemonError
    }

    return updatedTeam
  },

  // Delete a team
  async deleteTeam(teamId) {
    const user = await getRequiredUser()

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('user_id', user.id)

    if (error) throw error
  }
}
