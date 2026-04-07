import { supabase } from './supabase'
import { anonymousService } from './anonymousService'

export const teamService = {
  // Create a new team
  async createTeam(teamName, pokemonList) {
    const { data: { user } } = await supabase.auth.getUser()
    const anonymousId = anonymousService.getAnonymousId()

    const { data, error } = await supabase
      .from('teams')
      .insert([{
        user_id: user?.id || null,
        anonymous_id: anonymousId,
        name: teamName
      }])
      .select()
      .single()

    if (error) throw error

    const teamId = data.id

    // Insert pokemon
    const pokemonInserts = pokemonList.map(pokemon => ({
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
    }))

    const { error: pokemonError } = await supabase
      .from('team_pokemon')
      .insert(pokemonInserts)

    if (pokemonError) throw pokemonError

    return data
  },

  // Get user's teams
  async getUserTeams() {
    const { data: { user } } = await supabase.auth.getUser()
    const anonymousId = anonymousService.getAnonymousId()

    const { data, error } = await supabase
      .rpc('get_user_teams', {
        user_uuid: user?.id || null,
        anon_id: anonymousId
      })

    if (error) throw error

    // Transform the data to match the expected format
    return data.map(team => ({
      ...team,
      team_pokemon: team.team_pokemon.filter(p => p !== null) // Remove null entries from left join
    }))
  },

  // Update a team
  async updateTeam(teamId, teamName, pokemonList) {
    // Update team name
    const { error: teamError } = await supabase
      .from('teams')
      .update({ name: teamName })
      .eq('id', teamId)

    if (teamError) throw teamError

    // Delete existing pokemon
    const { error: deleteError } = await supabase
      .from('team_pokemon')
      .delete()
      .eq('team_id', teamId)

    if (deleteError) throw deleteError

    // Insert new pokemon
    const pokemonInserts = pokemonList.map(pokemon => ({
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
    }))

    const { error: pokemonError } = await supabase
      .from('team_pokemon')
      .insert(pokemonInserts)

    if (pokemonError) throw pokemonError

    return { id: teamId, name: teamName }
  },

  // Delete a team
  async deleteTeam(teamId) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) throw error
  }
}