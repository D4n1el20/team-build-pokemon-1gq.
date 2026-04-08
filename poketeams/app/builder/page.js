"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import PokemonSearch from './components/PokemonSearch';
import PokemonDetails from './components/PokemonDetails';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';
import BackToHome from '../components/BackToHome';

const DEFAULT_IVS = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31
};

const DEFAULT_EVS = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0
};

const LEGACY_STAT_KEYS = {
  atk: 'attack',
  def: 'defense',
  spa: 'specialAttack',
  spd: 'specialDefense',
  spe: 'speed'
};

function normalizeStatSpread(spread, defaults) {
  const normalized = { ...defaults };

  if (!spread || typeof spread !== 'object') {
    return normalized;
  }

  Object.entries(spread).forEach(([rawKey, rawValue]) => {
    const key = LEGACY_STAT_KEYS[rawKey] || rawKey;

    if (!(key in normalized)) return;

    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) {
      normalized[key] = numericValue;
    }
  });

  return normalized;
}

export default function Builder() {
  const [team, setTeam] = useState(Array(6).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [moves, setMoves] = useState([]);
  const [ability, setAbility] = useState('');
  const [item, setItem] = useState('');
  const [level, setLevel] = useState(50);
  const [ivs, setIvs] = useState({ ...DEFAULT_IVS });
  const [evs, setEvs] = useState({ ...DEFAULT_EVS });

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
  const router = useRouter();

  async function loadSavedTeams() {
    try {
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }

  async function loadTeamFromData(savedTeam) {
    try {
      const loadedTeam = Array(6).fill(null);

      for (let i = 0; i < savedTeam.team_pokemon.length && i < 6; i++) {
        const tp = savedTeam.team_pokemon[i];
        const savedMoves = Array.isArray(tp.moves) ? [...tp.moves] : [];
        const normalizedIvs = normalizeStatSpread(tp.ivs, DEFAULT_IVS);
        const normalizedEvs = normalizeStatSpread(tp.evs, DEFAULT_EVS);

        loadedTeam[i] = {
          id: tp.pokemon_id,
          name: tp.name,
          types: Array.isArray(tp.types) ? [...tp.types] : [],
          stats: tp.base_stats ? { ...tp.base_stats } : null,
          image: tp.image_url,
          abilities: tp.ability ? [tp.ability] : [],
          availableAbilities: tp.ability ? [tp.ability] : [],
          availableMoves: [...savedMoves],
          moves: [...savedMoves],
          nickname: tp.nickname ?? null,
          level: Number.isFinite(Number(tp.level)) ? Number(tp.level) : 50,
          ivs: normalizedIvs,
          evs: normalizedEvs,
          ability: tp.ability || '',
          item: tp.item || ''
        };
      }

      setTeam([...loadedTeam]);
      setSelectedSlot(null);
      setSelectedPokemon(null);
      setSearchTerm('');
      setMoves([]);
      setAbility('');
      setItem('');
      setLevel(50);
      setIvs({ ...DEFAULT_IVS });
      setEvs({ ...DEFAULT_EVS });
      setTeamName(savedTeam.name);
      setEditingTeamId(savedTeam.id);
      alert('Time carregado com sucesso para edicao!');
    } catch (error) {
      console.error('Error loading team from data:', error);
      alert('Erro ao carregar o time.');
    }
  }

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

    const { data: authListener } = authService.onAuthStateChange((event, session) => {
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

        const movesRes = await fetch('https://pokeapi.co/api/v2/move?limit=50');
        const movesData = await movesRes.json();
        setMovesList(movesData.results.map(m => m.name));

        const abilitiesRes = await fetch('https://pokeapi.co/api/v2/ability?limit=50');
        const abilitiesData = await abilitiesRes.json();
        setAbilitiesList(abilitiesData.results.map(a => a.name));

        const itemsRes = await fetch('https://pokeapi.co/api/v2/item-category/1'); // 1 is held-items
        const itemsData = await itemsRes.json();
        setItemsList(itemsData.items.slice(0, 50).map(i => i.name)); // Limit to 50

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
      loadSavedTeams();

      const loadedTeamData = localStorage.getItem('loaded_team');
      if (loadedTeamData) {
        try {
          const loadedTeam = JSON.parse(loadedTeamData);
          loadTeamFromData(loadedTeam);
          localStorage.removeItem('loaded_team'); // Limpar apos carregar
        } catch (error) {
          console.error('Error loading team from localStorage:', error);
        }
      }
    };

    loadInitialState();
  }, [authLoading, user]);

  const handlePokemonChange = (index, field, value) => {
    if (index === null || index < 0) return;

    setTeam((prev) => {
      if (!prev[index]) return prev;

      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };

      return updated;
    });
  };

  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    const pokemonInSlot = team[index];

    if (pokemonInSlot) {
      const normalizedIvs = normalizeStatSpread(pokemonInSlot.ivs, DEFAULT_IVS);
      const normalizedEvs = normalizeStatSpread(pokemonInSlot.evs, DEFAULT_EVS);
      const selectedMoves = Array.isArray(pokemonInSlot.moves) ? [...pokemonInSlot.moves] : [];
      const availableMoves = Array.isArray(pokemonInSlot.availableMoves)
        ? [...pokemonInSlot.availableMoves]
        : [...selectedMoves];
      const availableAbilities = Array.isArray(pokemonInSlot.availableAbilities)
        ? [...pokemonInSlot.availableAbilities]
        : Array.isArray(pokemonInSlot.abilities)
          ? [...pokemonInSlot.abilities]
          : (pokemonInSlot.ability ? [pokemonInSlot.ability] : []);

      setSelectedPokemon({
        ...pokemonInSlot,
        types: Array.isArray(pokemonInSlot.types) ? [...pokemonInSlot.types] : [],
        stats: pokemonInSlot.stats ? { ...pokemonInSlot.stats } : null,
        moves: availableMoves,
        availableMoves,
        abilities: availableAbilities,
        availableAbilities
      });
      setMoves(selectedMoves);
      setAbility(pokemonInSlot.ability || '');
      setItem(pokemonInSlot.item || '');
      setLevel(Number.isFinite(Number(pokemonInSlot.level)) ? Number(pokemonInSlot.level) : 50);
      setIvs(normalizedIvs);
      setEvs(normalizedEvs);
    } else {
      setSelectedPokemon(null);
      setMoves([]);
      setAbility('');
      setItem('');
      setLevel(50);
      setIvs({ ...DEFAULT_IVS });
      setEvs({ ...DEFAULT_EVS });
    }
  };

  const handlePokemonSelect = async (pokemon) => {
    try {
      const res = await fetch(pokemon.url);
      const data = await res.json();
      const defaultLevel = 50;
      const defaultIvs = { ...DEFAULT_IVS };
      const defaultEvs = { ...DEFAULT_EVS };
      const availableMoves = data.moves.slice(0, 20).map(m => m.move.name);
      const availableAbilities = data.abilities.map(a => a.ability.name);
      const pokemonDetails = {
        id: data.id,
        name: data.name,
        types: data.types.map(t => t.type.name),
        stats: {
          hp: data.stats.find(s => s.stat.name === 'hp').base_stat,
          attack: data.stats.find(s => s.stat.name === 'attack').base_stat,
          defense: data.stats.find(s => s.stat.name === 'defense').base_stat,
          specialAttack: data.stats.find(s => s.stat.name === 'special-attack').base_stat,
          specialDefense: data.stats.find(s => s.stat.name === 'special-defense').base_stat,
          speed: data.stats.find(s => s.stat.name === 'speed').base_stat,
        },
        image: data.sprites.front_default,
        abilities: availableAbilities,
        availableAbilities,
        moves: availableMoves, // Limit to first 20 moves
        availableMoves,
      };
      setSelectedPokemon(pokemonDetails);
      setMoves([]);
      setAbility('');
      setItem('');
      setLevel(defaultLevel);
      setIvs(defaultIvs);
      setEvs(defaultEvs);
      setTeam(prev => prev.map((p, i) => i === selectedSlot ? {
        ...pokemonDetails,
        moves: [],
        ability: '',
        item: '',
        level: defaultLevel,
        ivs: defaultIvs,
        evs: defaultEvs
      } : p));
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
    }
  };

  const handleMoveChange = (index, move) => {
    const newMoves = [...moves];
    newMoves[index] = move;
    setMoves(newMoves);
    handlePokemonChange(selectedSlot, 'moves', [...newMoves]);
  };

  const handleAbilityChange = (ability) => {
    setAbility(ability);
    handlePokemonChange(selectedSlot, 'ability', ability);
  };

  const handleItemChange = (item) => {
    setItem(item);
    handlePokemonChange(selectedSlot, 'item', item);
  };

  const handleLevelChange = (newLevel) => {
    const parsedLevel = Number(newLevel);
    if (!Number.isFinite(parsedLevel)) return;

    const normalizedLevel = Math.max(1, Math.min(100, parsedLevel));
    setLevel(normalizedLevel);
    handlePokemonChange(selectedSlot, 'level', normalizedLevel);
  };

  const handleIvChange = (stat, value) => {
    const normalizedStat = LEGACY_STAT_KEYS[stat] || stat;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    const normalizedValue = Math.max(0, Math.min(31, numericValue));
    const nextIvs = {
      ...ivs,
      [normalizedStat]: normalizedValue
    };

    setIvs(nextIvs);
    handlePokemonChange(selectedSlot, 'ivs', nextIvs);
  };

  const handleEvChange = (stat, value) => {
    const normalizedStat = LEGACY_STAT_KEYS[stat] || stat;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    const newValue = Math.max(0, Math.min(255, numericValue));
    const nextEvs = {
      ...evs,
      [normalizedStat]: newValue
    };
    const totalEvs = Object.values(nextEvs).reduce((sum, ev) => sum + ev, 0);

    if (totalEvs <= 510) {
      setEvs(nextEvs);
      handlePokemonChange(selectedSlot, 'evs', nextEvs);
    }
  };

  const handleClearPokemon = () => {
    setTeam(prev => prev.map((p, i) => i === selectedSlot ? null : p));
    setSelectedPokemon(null);
    setMoves([]);
    setAbility('');
    setItem('');
    setLevel(50);
    setIvs({ ...DEFAULT_IVS });
    setEvs({ ...DEFAULT_EVS });
  };

  const handleChangePokemon = () => {
    setSelectedPokemon(null);
    setSearchTerm('');
    setMoves([]);
    setAbility('');
    setItem('');
    setLevel(50);
    setIvs({ ...DEFAULT_IVS });
    setEvs({ ...DEFAULT_EVS });
  };

  const handleNewTeam = () => {
    setTeam(Array(6).fill(null));
    setSelectedSlot(null);
    setSearchTerm('');
    setSelectedPokemon(null);
    setMoves([]);
    setAbility('');
    setItem('');
    setLevel(50);
    setIvs({ ...DEFAULT_IVS });
    setEvs({ ...DEFAULT_EVS });
    setTeamName('Meu Time');
    setEditingTeamId(null);
  };


  const saveTeam = async () => {
    if (!user) {
      router.replace('/auth');
      return;
    }

    try {
      const pokemonList = team.filter(p => p).map(p => ({
        id: p.id,
        nickname: p.nickname,
        level: Number.isFinite(Number(p.level)) ? Number(p.level) : 50,
        ivs: normalizeStatSpread(p.ivs, DEFAULT_IVS),
        evs: normalizeStatSpread(p.evs, DEFAULT_EVS),
        moves: Array.isArray(p.moves) ? [...p.moves] : [],
        ability: p.ability,
        item: p.item,
        name: p.name,
        types: Array.isArray(p.types) ? [...p.types] : [],
        stats: p.stats ? { ...p.stats } : null,
        image: p.image
      }));

      if (editingTeamId !== null) {
        await teamService.updateTeam(editingTeamId, teamName, pokemonList);
        alert('Time atualizado com sucesso!');
      } else {
        const createdTeam = await teamService.createTeam(teamName, pokemonList);
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
    try {
      const loadedTeam = Array(6).fill(null);

      for (let i = 0; i < savedTeam.team_pokemon.length && i < 6; i++) {
        const tp = savedTeam.team_pokemon[i];
        const savedMoves = Array.isArray(tp.moves) ? [...tp.moves] : [];
        const normalizedIvs = normalizeStatSpread(tp.ivs, DEFAULT_IVS);
        const normalizedEvs = normalizeStatSpread(tp.evs, DEFAULT_EVS);
        const normalizedLevel = Number.isFinite(Number(tp.level)) ? Number(tp.level) : 50;
        const savedAbility = tp.ability || '';

        if (tp.name && tp.base_stats && tp.image_url) {
          loadedTeam[i] = {
            id: tp.pokemon_id,
            name: tp.name,
            types: Array.isArray(tp.types) ? [...tp.types] : [],
            stats: { ...tp.base_stats },
            image: tp.image_url,
            abilities: savedAbility ? [savedAbility] : [],
            availableAbilities: savedAbility ? [savedAbility] : [],
            availableMoves: [...savedMoves],
            // Dados salvos
            nickname: tp.nickname ?? null,
            level: normalizedLevel,
            ivs: normalizedIvs,
            evs: normalizedEvs,
            moves: [...savedMoves],
            ability: savedAbility,
            item: tp.item || ''
          };
        } else {
          try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${tp.pokemon_id}`);
            const data = await res.json();
            const fetchedAbilities = data.abilities.map(a => a.ability.name);
            const fetchedMoves = data.moves.slice(0, 20).map(m => m.move.name);

            loadedTeam[i] = {
              id: data.id,
              name: data.name,
              types: data.types.map(t => t.type.name),
              stats: {
                hp: data.stats.find(s => s.stat.name === 'hp').base_stat,
                attack: data.stats.find(s => s.stat.name === 'attack').base_stat,
                defense: data.stats.find(s => s.stat.name === 'defense').base_stat,
                specialAttack: data.stats.find(s => s.stat.name === 'special-attack').base_stat,
                specialDefense: data.stats.find(s => s.stat.name === 'special-defense').base_stat,
                speed: data.stats.find(s => s.stat.name === 'speed').base_stat,
              },
              image: data.sprites.front_default,
              abilities: fetchedAbilities,
              availableAbilities: fetchedAbilities,
              availableMoves: fetchedMoves,
              // Dados salvos
              nickname: tp.nickname ?? null,
              level: normalizedLevel,
              ivs: normalizedIvs,
              evs: normalizedEvs,
              moves: [...savedMoves],
              ability: savedAbility,
              item: tp.item || ''
            };
          } catch (error) {
            console.error(`Error loading Pokemon ${tp.pokemon_id}:`, error);
            // Fallback com dados basicos
            loadedTeam[i] = {
              id: tp.pokemon_id,
              name: `Pokemon ${tp.pokemon_id}`,
              types: [],
              stats: null,
              image: null,
              abilities: savedAbility ? [savedAbility] : [],
              availableAbilities: savedAbility ? [savedAbility] : [],
              availableMoves: [...savedMoves],
              nickname: tp.nickname ?? null,
              level: normalizedLevel,
              ivs: normalizedIvs,
              evs: normalizedEvs,
              moves: [...savedMoves],
              ability: savedAbility,
              item: tp.item || ''
            };
          }
        }
      }

      setTeam([...loadedTeam]);
      setSelectedSlot(null);
      setSelectedPokemon(null);
      setSearchTerm('');
      setMoves([]);
      setAbility('');
      setItem('');
      setLevel(50);
      setIvs({ ...DEFAULT_IVS });
      setEvs({ ...DEFAULT_EVS });
      setTeamName(savedTeam.name);
      setEditingTeamId(savedTeam.id);
      alert('Time carregado com sucesso!');
    } catch (error) {
      console.error('Error loading team:', error);
      alert('Erro ao carregar o time.');
    }
  };

  const calculateEffectiveStats = (baseStats) => {
    if (!baseStats || typeof baseStats !== 'object') return {};

    const effective = {};
    for (const stat in baseStats) {
      const base = baseStats[stat];
      const iv = ivs[stat] || 0;
      const ev = evs[stat] || 0;
      if (stat === 'hp') {
        effective[stat] = Math.floor(((base + iv + Math.floor(ev / 4)) * 2 + 100) * level / 100) + level + 10;
      } else {
        effective[stat] = Math.floor(((base + iv + Math.floor(ev / 4)) * 2) * level / 100) + 5;
      }
    }
    return effective;
  };

  const filteredPokemon = pokemonList.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (authLoading) {
    return <div className={styles.container}>Verificando autenticacao...</div>;
  }

  if (loading) {
    return <div className={styles.container}>Carregando...</div>;
  }

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
                  <img src={pokemon.image} alt={pokemon.name} className={styles.slotImage} />
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
            level={level}
            moves={moves}
            ability={ability}
            item={item}
            ivs={ivs}
            evs={evs}
            itemsList={itemsList}
            onLevelChange={handleLevelChange}
            onMoveChange={handleMoveChange}
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
          <p>Total de Pokemon: {team.filter(p => p).length}</p>
        </section>

        {savedTeams.length > 0 && (
          <section className={`${styles.panel} ${styles.savedTeamsSection}`}>
            <h2>Times Salvos</h2>
            <ul className={styles.savedTeamsList}>
              {savedTeams.map((savedTeam) => (
                <li key={savedTeam.id} className={styles.savedTeamItem}>
                  <span>{savedTeam.name}</span>
                  <button onClick={() => loadTeam(savedTeam)} className={`${styles.button} ${styles.secondaryButton} ${styles.loadButton}`}>Carregar</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
