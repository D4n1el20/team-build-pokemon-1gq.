"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teamService } from '../../lib/teamService';
import { authService } from '../../lib/authService';
import styles from './page.module.css';
import BackToHome from '../components/BackToHome';

export default function Teams() {
  const [savedTeams, setSavedTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const syncAuth = async () => {
      try {
        const {
          data: { user }
        } = await authService.getCurrentUser();

        if (!isMounted) return;

        if (!user) {
          setAuthLoading(false);
          router.replace('/auth');
          return;
        }

        setAuthLoading(false);
        loadSavedTeams();
      } catch (error) {
        if (!isMounted) return;
        console.error('Error validating auth:', error);
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

  const loadSavedTeams = async () => {
    try {
      setLoading(true);
      const teams = await teamService.getUserTeams();
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTeam = async (team) => {
    try {
      localStorage.setItem('loaded_team', JSON.stringify(team));
      router.push('/builder');
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };

  const handleViewTeam = (team) => {
    setSelectedTeam(team);
  };

  const handleCloseView = () => {
    setSelectedTeam(null);
  };

  const getTeamPokemonCount = (team) => team.team_pokemon.filter(Boolean).length;

  const calculateEffectiveStats = (
    baseStats,
    level = 50,
    ivs = {
      hp: 31,
      attack: 31,
      defense: 31,
      specialAttack: 31,
      specialDefense: 31,
      speed: 31
    },
    evs = {
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0
    }
  ) => {
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

  if (authLoading) {
    return (
      <div className={styles.container}>
        <BackToHome />
        <div className={styles.pageShell}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>Meus Times Salvos</h1>
            <p className={styles.subtitle}>Gerencie e visualize seus times</p>
          </header>
          <div className={styles.statusCard}>
            <p>Verificando autenticacao...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <BackToHome />
        <div className={styles.pageShell}>
          <header className={styles.pageHeader}>
            <h1 className={styles.title}>Meus Times Salvos</h1>
            <p className={styles.subtitle}>Gerencie e visualize seus times</p>
          </header>
          <div className={styles.statusCard}>
            <p>Carregando times...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <BackToHome />
      <div className={styles.pageShell}>
        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Meus Times Salvos</h1>
          <p className={styles.subtitle}>Gerencie e visualize seus times</p>
        </header>

        {savedTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Seu espaco de times esta vazio</p>
            <p className={styles.emptyText}>
              Monte seu primeiro time e volte aqui para acompanhar tudo em um painel completo.
            </p>
            <button
              onClick={() => router.push('/builder')}
              className={styles.createButton}
            >
              Criar Primeiro Time
            </button>
          </div>
        ) : (
          <div className={styles.teamsGrid}>
            {savedTeams.map((team) => (
              <div key={team.id} className={styles.teamCard}>
                <div className={styles.teamTop}>
                  <h3 className={styles.teamName}>{team.name}</h3>
                  <span className={styles.teamCount}>{getTeamPokemonCount(team)}/6 Pokemon</span>
                </div>

                <div className={styles.teamDivider} />

                <div className={styles.teamPreview}>
                  {team.team_pokemon.slice(0, 6).map((pokemon, index) => (
                    <div
                      key={index}
                      className={`${styles.pokemonSlot} ${pokemon ? styles.pokemonFilled : styles.pokemonEmpty}`}
                      title={pokemon ? pokemon.name : 'Slot vazio'}
                      data-name={pokemon ? pokemon.name : ''}
                    >
                      {pokemon ? (
                        <div className={styles.pokemonMini}>
                          <img
                            src={pokemon.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id}.png`}
                            alt={pokemon.name}
                            className={styles.pokemonImage}
                          />
                          <span className={styles.pokemonName}>{pokemon.name}</span>
                        </div>
                      ) : (
                        <div className={styles.emptySlot}>Vazio</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className={styles.teamActions}>
                  <button
                    onClick={() => handleViewTeam(team)}
                    className={styles.viewButton}
                  >
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => handleLoadTeam(team)}
                    className={styles.loadButton}
                  >
                    Carregar para Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTeam && (
        <div className={styles.modalOverlay} onClick={handleCloseView}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <h2>{selectedTeam.name}</h2>
                <p>{getTeamPokemonCount(selectedTeam)} de 6 Pokemon preenchidos</p>
              </div>
              <button
                onClick={handleCloseView}
                className={styles.closeButton}
                aria-label="Fechar modal"
              >
                X
              </button>
            </div>

            <div className={styles.teamDetails}>
              {selectedTeam.team_pokemon.map((pokemon, index) => (
                pokemon && (
                  <div key={index} className={styles.pokemonDetail}>
                    <div className={styles.pokemonHeader}>
                      <img
                        src={pokemon.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id}.png`}
                        alt={pokemon.name}
                        className={styles.pokemonDetailImage}
                      />
                      <div className={styles.pokemonInfo}>
                        <h3>{pokemon.name}</h3>
                        {pokemon.nickname && <p>Apelido: {pokemon.nickname}</p>}
                        <p>Nivel: {pokemon.level}</p>
                      </div>
                    </div>

                    <div className={styles.pokemonStats}>
                      <h4>Stats Efetivos:</h4>
                      {(() => {
                        const effectiveStats = calculateEffectiveStats(
                          pokemon.base_stats,
                          pokemon.level,
                          pokemon.ivs,
                          pokemon.evs
                        );
                        return (
                          <div className={styles.statsGrid}>
                            {Object.entries(effectiveStats).map(([stat, value]) => (
                              <div key={stat} className={styles.statItem}>
                                <span className={styles.statName}>{stat.toUpperCase()}</span>
                                <div className={styles.statBar}>
                                  <span
                                    className={styles.statFill}
                                    style={{ width: `${Math.min((value / 255) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className={styles.statValue}>{value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {pokemon.moves && pokemon.moves.length > 0 && (
                      <div className={styles.pokemonMoves}>
                        <h4>Movimentos:</h4>
                        <div className={styles.movesList}>
                          {pokemon.moves.map((move, moveIndex) => (
                            <span key={moveIndex} className={styles.moveTag}>{move}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(pokemon.ability || pokemon.item) && (
                      <div className={styles.pokemonMeta}>
                        {pokemon.ability && (
                          <p><strong>Habilidade:</strong> {pokemon.ability}</p>
                        )}
                        {pokemon.item && (
                          <p><strong>Item:</strong> {pokemon.item}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => handleLoadTeam(selectedTeam)}
                className={styles.loadButton}
              >
                Carregar para Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
