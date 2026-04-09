import { supabase } from './supabase'

const DEFAULT_LEVEL = 50
const DEFAULT_IVS = Object.freeze({
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31
})
const DEFAULT_EVS = Object.freeze({
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeMoves(moves) {
  const source = Array.isArray(moves) ? moves : []
  return Array.from({ length: 4 }, (_, index) => {
    const move = source[index]
    return typeof move === 'string' ? move : ''
  })
}

function normalizeStatSpread(spread, defaults, min, max) {
  const source = spread && typeof spread === 'object' ? spread : {}

  return {
    hp: clamp(toNumber(source.hp, defaults.hp), min, max),
    attack: clamp(toNumber(source.attack ?? source.atk, defaults.attack), min, max),
    defense: clamp(toNumber(source.defense ?? source.def, defaults.defense), min, max),
    specialAttack: clamp(
      toNumber(source.specialAttack ?? source.spAtk ?? source.spa, defaults.specialAttack),
      min,
      max
    ),
    specialDefense: clamp(
      toNumber(source.specialDefense ?? source.spDef ?? source.spd, defaults.specialDefense),
      min,
      max
    ),
    speed: clamp(toNumber(source.speed ?? source.spe, defaults.speed), min, max)
  }
}

function normalizePokemonConfig(pokemon = {}) {
  return {
    level: clamp(toNumber(pokemon.level, DEFAULT_LEVEL), 1, 100),
    ivs: normalizeStatSpread(pokemon.ivs, DEFAULT_IVS, 0, 31),
    evs: normalizeStatSpread(pokemon.evs, DEFAULT_EVS, 0, 255),
    moves: normalizeMoves(pokemon.moves),
    ability: typeof pokemon.ability === 'string' ? pokemon.ability : '',
    item: typeof pokemon.item === 'string' ? pokemon.item : ''
  }
}

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
  const normalizedConfig = normalizePokemonConfig(pokemon)

  return {
    team_id: teamId,
    pokemon_id: pokemon.id,
    nickname: pokemon.nickname ?? null,
    level: normalizedConfig.level,
    ivs: normalizedConfig.ivs,
    evs: normalizedConfig.evs,
    moves: normalizedConfig.moves,
    ability: normalizedConfig.ability,
    item: normalizedConfig.item,
    name: pokemon.name,
    types: Array.isArray(pokemon.types) ? pokemon.types : [],
    base_stats: pokemon.stats && typeof pokemon.stats === 'object' ? pokemon.stats : null,
    image_url: pokemon.image ?? null
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
      team_pokemon: (team.team_pokemon || []).filter(Boolean).map((pokemon) => {
        const normalizedConfig = normalizePokemonConfig(pokemon)
        return {
          ...pokemon,
          level: normalizedConfig.level,
          ivs: normalizedConfig.ivs,
          evs: normalizedConfig.evs,
          moves: normalizedConfig.moves,
          ability: normalizedConfig.ability,
          item: normalizedConfig.item
        }
      })
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
    if (!teamId) {
      throw new Error('TEAM_ID_REQUIRED')
    }

    const user = await getRequiredUser()

    const { data: existingTeam, error: teamLookupError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (teamLookupError) throw teamLookupError
    if (!existingTeam) throw new Error('TEAM_NOT_FOUND')

    const { error: deletePokemonError } = await supabase
      .from('team_pokemon')
      .delete()
      .eq('team_id', teamId)

    if (deletePokemonError) throw deletePokemonError

    const { error: deleteTeamError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)
      .eq('user_id', user.id)

    if (deleteTeamError) throw deleteTeamError
  }
}
