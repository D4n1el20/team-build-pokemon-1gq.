"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import PokemonSearch from './components/PokemonSearch';
import PokemonDetails from './components/PokemonDetails';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';
import BackToHome from '../components/BackToHome';

const DEFAULT_LEVEL = 50;
const DEFAULT_MOVES = Object.freeze(['', '', '', '']);
const DEFAULT_IVS = Object.freeze({
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31
});
const DEFAULT_EVS = Object.freeze({
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMoves = (moves) => {
  const source = Array.isArray(moves) ? moves : [];
  return Array.from({ length: 4 }, (_, index) => {
    const currentMove = source[index];
    return typeof currentMove === 'string' ? currentMove : '';
  });
};

const normalizeStatSpread = (spread, defaults, min, max) => {
  const source = spread && typeof spread === 'object' ? spread : {};
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
  };
};

const normalizePokemonConfig = (pokemon = {}) => ({
  level: clamp(toNumber(pokemon.level, DEFAULT_LEVEL), 1, 100),
  moves: normalizeMoves(pokemon.moves),
  ability: typeof pokemon.ability === 'string' ? pokemon.ability : '',
  item: typeof pokemon.item === 'string' ? pokemon.item : '',
  ivs: normalizeStatSpread(pokemon.ivs, DEFAULT_IVS, 0, 31),
  evs: normalizeStatSpread(pokemon.evs, DEFAULT_EVS, 0, 255)
});

const mapStoredPokemonToBuilder = (storedPokemon) => {
  const normalized = normalizePokemonConfig(storedPokemon);

  return {
    id: storedPokemon.pokemon_id,
    name: storedPokemon.name || '',
    types: Array.isArray(storedPokemon.types) ? storedPokemon.types : [],
    stats: storedPokemon.base_stats || {},
    image: storedPokemon.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${storedPokemon.pokemon_id}.png`,
    abilities: [],
    availableMoves: [],
    nickname: storedPokemon.nickname ?? null,
    ...normalized
  };
};

export default function Builder() {
  const [team, setTeam] = useState(Array(6).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);

  const [pokemonList, setPokemonList] = useState([]);
  const [movesList, setMovesList] = useState([]);
  const [abilitiesList, setAbilitiesList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [teamName, setTeamName] = useState('Meu Time');
  const [savedTeams, setSavedTeams] = useState([]);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const router = useRouter();

  const loadSavedTeams = useCallback(async () => {
    try {
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }, []);

  const enrichStoredPokemon = useCallback(async (storedPokemon) => {
    const basePokemon = mapStoredPokemonToBuilder(storedPokemon);

    if (storedPokemon.name && storedPokemon.base_stats && storedPokemon.image_url) {
      return basePokemon;
    }

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${storedPokemon.pokemon_id}`);
      const data = await res.json();

      return {
        ...basePokemon,
        id: data.id,
        name: data.name,
        types: data.types.map((typeData) => typeData.type.name),
        stats: {
          hp: data.stats.find((statData) => statData.stat.name === 'hp').base_stat,
          attack: data.stats.find((statData) => statData.stat.name === 'attack').base_stat,
          defense: data.stats.find((statData) => statData.stat.name === 'defense').base_stat,
          specialAttack: data.stats.find((statData) => statData.stat.name === 'special-attack').base_stat,
          specialDefense: data.stats.find((statData) => statData.stat.name === 'special-defense').base_stat,
          speed: data.stats.find((statData) => statData.stat.name === 'speed').base_stat
        },
        image: data.sprites.front_default || basePokemon.image,
        abilities: data.abilities.map((abilityData) => abilityData.ability.name),
        availableMoves: data.moves.slice(0, 100).map((moveData) => moveData.move.name)
      };
    } catch (error) {
      console.error(`Error loading Pokemon ${storedPokemon.pokemon_id}:`, error);
      return basePokemon;
    }
  }, []);

  const loadTeamFromData = useCallback(async (savedTeam) => {
    try {
      const loadedTeam = Array(6).fill(null);
      const storedTeamPokemon = Array.isArray(savedTeam.team_pokemon)
        ? savedTeam.team_pokemon.filter(Boolean)
        : [];

      for (let i = 0; i < storedTeamPokemon.length && i < 6; i++) {
        const storedPokemon = storedTeamPokemon[i];
        loadedTeam[i] = await enrichStoredPokemon(storedPokemon);
      }

      setTeam(loadedTeam);
      setTeamName(savedTeam.name);
      setEditingTeamId(savedTeam.id);
      setSelectedSlot(null);
      setSelectedPokemon(null);
      setSearchTerm('');
      alert('Time carregado com sucesso para edicao!');
    } catch (error) {
      console.error('Error loading team from data:', error);
      alert('Erro ao carregar o time.');
    }
  }, [enrichStoredPokemon]);

  useEffect(() => {
    let isMounted = true;

    const syncAuth = async () => {
      try {
        const {
          data: { user: currentUser }
        } = await authService.getCurrentUser();

        if (!isMounted) return;

        setUser(currentUser ?? null);
        setAuthLoading(false);

        if (!currentUser) {
          router.replace('/auth');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error validating auth:', error);
        setUser(null);
        setAuthLoading(false);
        router.replace('/auth');
      }
    };

    syncAuth();

    const { data: authListener } = authService.onAuthStateChange(() => {
      void syncAuth();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        const pokemonRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const pokemonData = await pokemonRes.json();
        setPokemonList(pokemonData.results);

        const movesRes = await fetch('https://pokeapi.co/api/v2/move?limit=100');
        const movesData = await movesRes.json();
        setMovesList(movesData.results.map((moveData) => moveData.name));

        const abilitiesRes = await fetch('https://pokeapi.co/api/v2/ability?limit=100');
        const abilitiesData = await abilitiesRes.json();
        setAbilitiesList(abilitiesData.results.map((abilityData) => abilityData.name));

        const itemsRes = await fetch('https://pokeapi.co/api/v2/item-category/1');
        const itemsData = await itemsRes.json();
        setItemsList(itemsData.items.slice(0, 100).map((itemData) => itemData.name));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadInitialState = async () => {
      await loadSavedTeams();

      const loadedTeamData = localStorage.getItem('loaded_team');
      if (loadedTeamData) {
        try {
          const loadedTeam = JSON.parse(loadedTeamData);
          await loadTeamFromData(loadedTeam);
          localStorage.removeItem('loaded_team');
        } catch (error) {
          console.error('Error loading team from localStorage:', error);
        }
      }
    };

    void loadInitialState();
  }, [authLoading, user, loadSavedTeams, loadTeamFromData]);

  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    setSearchTerm('');
    setSelectedPokemon(team[index] ? { ...team[index], ...normalizePokemonConfig(team[index]) } : null);
  };

  const handlePokemonSelect = async (pokemon) => {
    if (selectedSlot === null) return;

    try {
      const res = await fetch(pokemon.url);
      const data = await res.json();

      const pokemonDetails = {
        id: data.id,
        name: data.name,
        types: data.types.map((typeData) => typeData.type.name),
        stats: {
          hp: data.stats.find((statData) => statData.stat.name === 'hp').base_stat,
          attack: data.stats.find((statData) => statData.stat.name === 'attack').base_stat,
          defense: data.stats.find((statData) => statData.stat.name === 'defense').base_stat,
          specialAttack: data.stats.find((statData) => statData.stat.name === 'special-attack').base_stat,
          specialDefense: data.stats.find((statData) => statData.stat.name === 'special-defense').base_stat,
          speed: data.stats.find((statData) => statData.stat.name === 'speed').base_stat
        },
        image: data.sprites.front_default,
        abilities: data.abilities.map((abilityData) => abilityData.ability.name),
        availableMoves: data.moves.slice(0, 100).map((moveData) => moveData.move.name),
        nickname: null,
        ...normalizePokemonConfig({})
      };

      setSelectedPokemon(pokemonDetails);
      setTeam((prev) => prev.map((teamPokemon, index) => (index === selectedSlot ? pokemonDetails : teamPokemon)));
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
    }
  };

  const handlePokemonChange = (index, field, value) => {
    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[index];

      if (!currentPokemon) return prev;

      const updatedPokemon = {
        ...currentPokemon,
        [field]: value
      };

      updated[index] = updatedPokemon;

      if (selectedSlot === index) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleMoveChange = (pokemonIndex, moveIndex, value) => {
    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[pokemonIndex];

      if (!currentPokemon) return prev;

      const currentMoves = normalizeMoves(currentPokemon.moves);
      currentMoves[moveIndex] = value;

      const updatedPokemon = {
        ...currentPokemon,
        moves: currentMoves
      };

      updated[pokemonIndex] = updatedPokemon;

      if (selectedSlot === pokemonIndex) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleNestedChange = (index, group, field, value) => {
    const numericValue = toNumber(value, 0);

    setTeam((prev) => {
      const updated = [...prev];
      const currentPokemon = updated[index];

      if (!currentPokemon) return prev;

      const currentConfig = normalizePokemonConfig(currentPokemon);
      const sourceGroup = group === 'ivs' ? currentConfig.ivs : currentConfig.evs;
      const nextValue = group === 'ivs'
        ? clamp(numericValue, 0, 31)
        : clamp(numericValue, 0, 255);

      const nextGroup = {
        ...sourceGroup,
        [field]: nextValue
      };

      if (group === 'evs') {
        const totalEvs = Object.values(nextGroup).reduce((sum, ev) => sum + ev, 0);
        if (totalEvs > 510) {
          return prev;
        }
      }

      const updatedPokemon = {
        ...currentPokemon,
        [group]: nextGroup
      };

      updated[index] = updatedPokemon;

      if (selectedSlot === index) {
        setSelectedPokemon(updatedPokemon);
      }

      return updated;
    });
  };

  const handleAbilityChange = (value) => {
    if (selectedSlot === null) return;
    handlePokemonChange(selectedSlot, 'ability', value);
  };

  const handleItemChange = (value) => {
    if (selectedSlot === null) return;
    handlePokemonChange(selectedSlot, 'item', value);
  };

  const handleLevelChange = (value) => {
    if (selectedSlot === null) return;
    const normalizedLevel = clamp(toNumber(value, DEFAULT_LEVEL), 1, 100);
    handlePokemonChange(selectedSlot, 'level', normalizedLevel);
  };

  const handleIvChange = (stat, value) => {
    if (selectedSlot === null) return;
    handleNestedChange(selectedSlot, 'ivs', stat, value);
  };

  const handleEvChange = (stat, value) => {
    if (selectedSlot === null) return;
    handleNestedChange(selectedSlot, 'evs', stat, value);
  };

  const handleClearPokemon = () => {
    if (selectedSlot === null) return;

    setTeam((prev) => prev.map((teamPokemon, index) => (index === selectedSlot ? null : teamPokemon)));
    setSelectedPokemon(null);
    setSearchTerm('');
  };

  const handleChangePokemon = () => {
    setSelectedPokemon(null);
    setSearchTerm('');
  };

  const resetBuilder = () => {
    setTeam(Array(6).fill(null));
    setSelectedSlot(null);
    setSearchTerm('');
    setSelectedPokemon(null);
    setTeamName('Meu Time');
    setEditingTeamId(null);
  };

  const handleNewTeam = () => {
    resetBuilder();
  };

  const handleDeleteTeam = async (teamId) => {
    if (!teamId) {
      alert('ID do time invalido.');
      return;
    }

    const confirmDelete = window.confirm('Tem certeza que deseja excluir este time?');
    if (!confirmDelete) return;

    try {
      setDeletingTeamId(teamId);
      await teamService.deleteTeam(teamId);
      alert('Time excluido com sucesso!');

      if (teamId === editingTeamId) {
        resetBuilder();
      }

      await loadSavedTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Erro ao excluir time.');
    } finally {
      setDeletingTeamId(null);
    }
  };

  const saveTeam = async () => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    try {
      const normalizedPokemonList = team.filter(Boolean).map((pokemon) => {
        const normalizedConfig = normalizePokemonConfig(pokemon);
        return {
          id: pokemon.id,
          nickname: pokemon.nickname ?? null,
          level: normalizedConfig.level,
          ivs: normalizedConfig.ivs,
          evs: normalizedConfig.evs,
          moves: normalizedConfig.moves,
          ability: normalizedConfig.ability,
          item: normalizedConfig.item,
          name: pokemon.name,
          types: Array.isArray(pokemon.types) ? pokemon.types : [],
          stats: pokemon.stats || {},
          image: pokemon.image || null
        };
      });

      if (editingTeamId !== null) {
        await teamService.updateTeam(editingTeamId, teamName, normalizedPokemonList);
        alert('Time atualizado com sucesso!');
      } else {
        const createdTeam = await teamService.createTeam(teamName, normalizedPokemonList);
        setEditingTeamId(createdTeam.id);
        alert('Time criado com sucesso!');
      }

      await loadSavedTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erro ao salvar o time.');
    }
  };

  const loadTeam = async (savedTeam) => {
    await loadTeamFromData(savedTeam);
  };

  const calculateEffectiveStats = (pokemon) => {
    if (!pokemon?.stats) return {};

    const effective = {};
    const normalizedConfig = normalizePokemonConfig(pokemon);

    for (const stat in pokemon.stats) {
      const base = pokemon.stats[stat];
      const iv = normalizedConfig.ivs[stat] || 0;
      const ev = normalizedConfig.evs[stat] || 0;

      if (stat === 'hp') {
        effective[stat] = Math.floor(((base + iv + Math.floor(ev / 4)) * 2 + 100) * normalizedConfig.level / 100) + normalizedConfig.level + 10;
      } else {
        effective[stat] = Math.floor(((base + iv + Math.floor(ev / 4)) * 2) * normalizedConfig.level / 100) + 5;
      }
    }

    return effective;
  };

  const filteredPokemon = pokemonList.filter((pokemon) =>
    pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return <div className={styles.container}>Verificando autenticacao...</div>;
  }

  if (loading) {
    return <div className={styles.container}>Carregando...</div>;
  }

  const selectedConfig = selectedPokemon ? normalizePokemonConfig(selectedPokemon) : null;

  return (
    <div className={styles.container}>
      <BackToHome />

      <section className={`${styles.panel} ${styles.teamSection}`}>
        <h1 className={styles.title}>Construtor de Times</h1>
        <p className={styles.editingStatus}>{editingTeamId !== null ? `Editando: ${teamName}` : 'Novo Time'}</p>
        <div className={styles.saveSection}>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nome do Time"
            className={styles.teamNameInput}
          />
          <button onClick={saveTeam} className={`${styles.button} ${styles.primaryButton} ${styles.saveButton}`}>Salvar Time</button>
          <button onClick={handleNewTeam} className={`${styles.button} ${styles.secondaryButton}`}>Novo Time</button>
        </div>

        <div className={styles.teamSlots}>
          {team.map((pokemon, index) => (
            <div
              key={index}
              onClick={() => handleSlotClick(index)}
              className={`${styles.slot} ${pokemon ? styles.slotFilled : ''} ${selectedSlot === index ? styles.slotActive : ''}`}
            >
              {pokemon ? (
                <>
                  <img
                    src={pokemon.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                    alt={pokemon.name}
                    className={styles.slotImage}
                  />
                  <span className={styles.slotName}>{pokemon.name}</span>
                </>
              ) : (
                <>
                  <span className={styles.slotPlus}>+</span>
                  <span className={styles.slotEmptyText}>Adicionar</span>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.selectionSection}`}>
        {selectedSlot === null ? (
          <div className={styles.selectionPlaceholder}>
            <h2>Configuracao do Pokemon</h2>
            <p>Selecione um slot do time para iniciar a configuracao.</p>
          </div>
        ) : !selectedPokemon ? (
          <PokemonSearch
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filteredPokemon={filteredPokemon}
            selectedPokemon={selectedPokemon}
            onPokemonSelect={handlePokemonSelect}
          />
        ) : (
          <PokemonDetails
            selectedPokemon={selectedPokemon}
            level={selectedConfig?.level ?? DEFAULT_LEVEL}
            moves={selectedConfig?.moves ?? [...DEFAULT_MOVES]}
            ability={selectedConfig?.ability ?? ''}
            item={selectedConfig?.item ?? ''}
            ivs={selectedConfig?.ivs ?? { ...DEFAULT_IVS }}
            evs={selectedConfig?.evs ?? { ...DEFAULT_EVS }}
            movesList={movesList}
            abilitiesList={abilitiesList}
            itemsList={itemsList}
            onLevelChange={handleLevelChange}
            onMoveChange={(moveIndex, value) => {
              if (selectedSlot === null) return;
              handleMoveChange(selectedSlot, moveIndex, value);
            }}
            onAbilityChange={handleAbilityChange}
            onItemChange={handleItemChange}
            onIvChange={handleIvChange}
            onEvChange={handleEvChange}
            calculateEffectiveStats={calculateEffectiveStats}
            onClearPokemon={handleClearPokemon}
            onChangePokemon={handleChangePokemon}
          />
        )}
      </section>

      <aside className={styles.rightColumn}>
        <section className={`${styles.panel} ${styles.analysisSection}`}>
          <h2>Analise do Time</h2>
          <p>Total de Pokemon: {team.filter(Boolean).length}</p>
        </section>

        {savedTeams.length > 0 && (
          <section className={`${styles.panel} ${styles.savedTeamsSection}`}>
            <h2>Times Salvos</h2>
            <ul className={styles.savedTeamsList}>
              {savedTeams.map((savedTeam) => (
                <li key={savedTeam.id} className={styles.savedTeamItem}>
                  <span>{savedTeam.name}</span>
                  <div className={styles.savedTeamActions}>
                    <button
                      onClick={() => loadTeam(savedTeam)}
                      className={`${styles.button} ${styles.secondaryButton} ${styles.loadButton}`}
                      disabled={deletingTeamId === savedTeam.id}
                    >
                      Carregar
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(savedTeam.id)}
                      className={`${styles.button} ${styles.dangerButton} ${styles.loadButton}`}
                      disabled={deletingTeamId === savedTeam.id}
                    >
                      {deletingTeamId === savedTeam.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
