"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import PokemonSearch from './components/PokemonSearch';
import PokemonDetails from './components/PokemonDetails';
import { supabase } from '../../lib/supabase';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';

export default function Builder() {
  const [team, setTeam] = useState(Array(6).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [moves, setMoves] = useState([]);
  const [ability, setAbility] = useState('');
  const [item, setItem] = useState('');
  const [level, setLevel] = useState(50);
  const [ivs, setIvs] = useState({ hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 });
  const [evs, setEvs] = useState({ hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });

  const [pokemonList, setPokemonList] = useState([]);
  const [movesList, setMovesList] = useState([]);
  const [abilitiesList, setAbilitiesList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [teamName, setTeamName] = useState('Meu Time');
  const [savedTeams, setSavedTeams] = useState([]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await authService.getCurrentUser();
      setUser(user);
      loadSavedTeams();

      const loadedTeamData = localStorage.getItem('loaded_team');
      if (loadedTeamData) {
        try {
          const loadedTeam = JSON.parse(loadedTeamData);
          loadTeamFromData(loadedTeam);
          localStorage.removeItem('loaded_team'); // Limpar após carregar
        } catch (error) {
          console.error('Error loading team from localStorage:', error);
        }
      }
    };
    getUser();

    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      loadSavedTeams();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    const pokemonInSlot = team[index];

    if (pokemonInSlot) {
      setSelectedPokemon(pokemonInSlot);
      setMoves(pokemonInSlot.moves || []);
      setAbility(pokemonInSlot.ability || '');
      setItem(pokemonInSlot.item || '');
      setLevel(pokemonInSlot.level || 50);
      setIvs(pokemonInSlot.ivs || { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 });
      setEvs(pokemonInSlot.evs || { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });
    } else {
      setSelectedPokemon(null);
      setMoves([]);
      setAbility('');
      setItem('');
      setLevel(50);
      setIvs({ hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 });
      setEvs({ hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });
    }
  };

  const handlePokemonSelect = async (pokemon) => {
    try {
      const res = await fetch(pokemon.url);
      const data = await res.json();
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
        abilities: data.abilities.map(a => a.ability.name),
        moves: data.moves.slice(0, 20).map(m => m.move.name), // Limit to first 20 moves
      };
      setSelectedPokemon(pokemonDetails);
      setMoves([]);
      setAbility('');
      setItem('');
      setTeam(prev => prev.map((p, i) => i === selectedSlot ? { ...pokemonDetails, moves: [], ability: '', item: '' } : p));
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
    }
  };

  const handleMoveChange = (index, move) => {
    const newMoves = [...moves];
    newMoves[index] = move;
    setMoves(newMoves);
    setTeam(prev => prev.map((p, i) => i === selectedSlot ? { ...p, moves: newMoves } : p));
  };

  const handleAbilityChange = (ability) => {
    setAbility(ability);
    setTeam(prev => prev.map((p, i) => i === selectedSlot ? { ...p, ability } : p));
  };

  const handleItemChange = (item) => {
    setItem(item);
    setTeam(prev => prev.map((p, i) => i === selectedSlot ? { ...p, item } : p));
  };

  const handleLevelChange = (newLevel) => {
    setLevel(Math.max(1, Math.min(100, newLevel)));
  };

  const handleIvChange = (stat, value) => {
    setIvs(prev => ({ ...prev, [stat]: Math.max(0, Math.min(31, value)) }));
  };

  const handleEvChange = (stat, value) => {
    const newValue = Math.max(0, Math.min(255, value));
    const totalEvs = Object.values(evs).reduce((sum, ev) => sum + ev, 0) - evs[stat] + newValue;
    if (totalEvs <= 510) {
      setEvs(prev => ({ ...prev, [stat]: newValue }));
    }
  };

  const handleClearPokemon = () => {
    setTeam(prev => prev.map((p, i) => i === selectedSlot ? null : p));
    setSelectedPokemon(null);
    setMoves([]);
    setAbility('');
    setItem('');
    setLevel(50);
    setIvs({ hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 });
    setEvs({ hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });
  };

  const handleChangePokemon = () => {
    setSelectedPokemon(null);
    setSearchTerm('');
    setMoves([]);
    setAbility('');
    setItem('');
    setLevel(50);
    setIvs({ hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 });
    setEvs({ hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 });
  };

  const loadSavedTeams = async () => {
    try {
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const saveTeam = async () => {
    try {
      const pokemonList = team.filter(p => p).map(p => ({
        id: p.id,
        nickname: p.nickname,
        level: p.level,
        ivs: p.ivs,
        evs: p.evs,
        moves: p.moves,
        ability: p.ability,
        item: p.item,
        name: p.name,
        types: p.types,
        stats: p.stats,
        image: p.image
      }));
      await teamService.createTeam(teamName, pokemonList);
      alert('Time salvo com sucesso!');
      loadSavedTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erro ao salvar o time.');
    }
  };

  const loadTeamFromData = async (savedTeam) => {
    try {
      const loadedTeam = Array(6).fill(null);

      for (let i = 0; i < savedTeam.team_pokemon.length && i < 6; i++) {
        const tp = savedTeam.team_pokemon[i];

        loadedTeam[i] = {
          id: tp.pokemon_id,
          name: tp.name,
          types: tp.types || [],
          stats: tp.base_stats,
          image: tp.image_url,
          abilities: [],
          moves: [],
          nickname: tp.nickname,
          level: tp.level,
          ivs: tp.ivs,
          evs: tp.evs,
          moves: tp.moves,
          ability: tp.ability,
          item: tp.item
        };
      }

      setTeam(loadedTeam);
      setTeamName(savedTeam.name);
      alert('Time carregado com sucesso para edição!');
    } catch (error) {
      console.error('Error loading team from data:', error);
      alert('Erro ao carregar o time.');
    }
  };

  const loadTeam = async (savedTeam) => {
    try {
      const loadedTeam = Array(6).fill(null);

      for (let i = 0; i < savedTeam.team_pokemon.length && i < 6; i++) {
        const tp = savedTeam.team_pokemon[i];

        if (tp.name && tp.base_stats && tp.image_url) {
          loadedTeam[i] = {
            id: tp.pokemon_id,
            name: tp.name,
            types: tp.types || [],
            stats: tp.base_stats,
            image: tp.image_url,
            abilities: [],
            moves: [],
            // Dados salvos
            nickname: tp.nickname,
            level: tp.level,
            ivs: tp.ivs,
            evs: tp.evs,
            moves: tp.moves,
            ability: tp.ability,
            item: tp.item
          };
        } else {
          try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${tp.pokemon_id}`);
            const data = await res.json();

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
              abilities: data.abilities.map(a => a.ability.name),
              moves: data.moves.slice(0, 20).map(m => m.move.name),
              // Dados salvos
              nickname: tp.nickname,
              level: tp.level,
              ivs: tp.ivs,
              evs: tp.evs,
              moves: tp.moves,
              ability: tp.ability,
              item: tp.item
            };
          } catch (error) {
            console.error(`Error loading Pokemon ${tp.pokemon_id}:`, error);
            // Fallback com dados básicos
            loadedTeam[i] = {
              id: tp.pokemon_id,
              name: `Pokemon ${tp.pokemon_id}`,
              nickname: tp.nickname,
              level: tp.level,
              ivs: tp.ivs,
              evs: tp.evs,
              moves: tp.moves,
              ability: tp.ability,
              item: tp.item
            };
          }
        }
      }

      setTeam(loadedTeam);
      setTeamName(savedTeam.name);
      alert('Time carregado com sucesso!');
    } catch (error) {
      console.error('Error loading team:', error);
      alert('Erro ao carregar o time.');
    }
  };

  const calculateEffectiveStats = (baseStats) => {
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

  if (loading) {
    return <div className={styles.container}>Carregando...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.teamSection}>
        <h1 className={styles.title}>Construtor de Times</h1>
        <div className={styles.saveSection}>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nome do Time"
            className={styles.teamNameInput}
          />
          <button onClick={saveTeam} className={styles.saveButton}>Salvar Time</button>
        </div>
        <div className={styles.teamSlots}>
          {team.map((pokemon, index) => (
            <div
              key={index}
              onClick={() => handleSlotClick(index)}
              className={`${styles.slot} ${pokemon ? styles.slotFilled : ''}`}
            >
              {pokemon ? (
                <img src={pokemon.image} alt={pokemon.name} className={styles.slotImage} />
              ) : (
                '+'
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedSlot !== null && (
        <div className={styles.selectionSection}>
          {!selectedPokemon ? (
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
        </div>
      )}

      <div className={styles.analysisSection}>
        <h2>Análise do Time</h2>
        <p>Total de Pokémon: {team.filter(p => p).length}</p>
      </div>

      {savedTeams.length > 0 && (
        <div className={styles.savedTeamsSection}>
          <h2>Times Salvos</h2>
          <ul className={styles.savedTeamsList}>
            {savedTeams.map((savedTeam) => (
              <li key={savedTeam.id} className={styles.savedTeamItem}>
                <span>{savedTeam.name}</span>
                <button onClick={() => loadTeam(savedTeam)} className={styles.loadButton}>Carregar</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}