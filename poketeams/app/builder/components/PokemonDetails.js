import styles from '../page.module.css';

export default function PokemonDetails({
  selectedPokemon,
  level,
  moves,
  ability,
  item,
  ivs,
  evs,
  itemsList,
  onLevelChange,
  onMoveChange,
  onAbilityChange,
  onItemChange,
  onIvChange,
  onEvChange,
  calculateEffectiveStats,
  onClearPokemon,
  onChangePokemon,
}) {
  if (!selectedPokemon) return null;

  const effective = calculateEffectiveStats(selectedPokemon.stats);
  const totalEvs = Object.values(evs).reduce((sum, ev) => sum + ev, 0);

  return (
    <div className={styles.pokemonDetails}>
      <div className={styles.pokemonDetailsHeader}>
        <div>
          <h3>{selectedPokemon.name}</h3>
          <img src={selectedPokemon.image} alt={selectedPokemon.name} className={styles.pokemonImageLarge} />
          <p>Tipos: {selectedPokemon.types.join(', ')}</p>
          <p>Stats Efetivos (Lv. {level}): HP: {effective.hp}, Ataque: {effective.attack}, Defesa: {effective.defense}, Ataque Especial: {effective.specialAttack}, Defesa Especial: {effective.specialDefense}, Velocidade: {effective.speed}</p>
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={onChangePokemon} className={styles.changeButton}>Trocar Pokémon</button>
          <button onClick={onClearPokemon} className={styles.deleteButton}>Deletar</button>
        </div>
      </div>

      <div className={styles.movesSection}>
        <h4>Golpes:</h4>
        {Array(4).fill().map((_, i) => (
          <select key={i} value={moves[i] || ''} onChange={(e) => onMoveChange(i, e.target.value)} className={styles.moveSelect}>
            <option value="">Selecionar</option>
            {selectedPokemon.moves.map(move => <option key={move} value={move}>{move}</option>)}
          </select>
        ))}
      </div>

      <div className={styles.abilitySection}>
        <h4>Habilidade:</h4>
        <select value={ability} onChange={(e) => onAbilityChange(e.target.value)}>
          <option value="">Selecionar</option>
          {selectedPokemon.abilities.map(abil => <option key={abil} value={abil}>{abil}</option>)}
        </select>
      </div>

      <div className={styles.itemSection}>
        <h4>Item Hold:</h4>
        <select value={item} onChange={(e) => onItemChange(e.target.value)}>
          <option value="">Selecionar</option>
          {itemsList.map(it => <option key={it} value={it}>{it}</option>)}
        </select>
      </div>

      <div className={styles.levelSection}>
        <h4>Nível:</h4>
        <input
          type="number"
          value={level}
          onChange={(e) => onLevelChange(parseInt(e.target.value) || 50)}
          min="1"
          max="100"
          className={styles.input}
        />
      </div>

      <div className={styles.ivsSection}>
        <h4>IVs (0-31):</h4>
        {Object.keys(ivs).map(stat => (
          <div key={stat}>
            <label>{stat.charAt(0).toUpperCase() + stat.slice(1)}:</label>
            <input
              type="number"
              value={ivs[stat]}
              onChange={(e) => onIvChange(stat, parseInt(e.target.value) || 0)}
              min="0"
              max="31"
              className={styles.input}
            />
          </div>
        ))}
      </div>

      <div className={styles.evsSection}>
        <h4>EVs (0-255, total ≤510):</h4>
        {Object.keys(evs).map(stat => (
          <div key={stat}>
            <label>{stat.charAt(0).toUpperCase() + stat.slice(1)}:</label>
            <input
              type="number"
              value={evs[stat]}
              onChange={(e) => onEvChange(stat, parseInt(e.target.value) || 0)}
              min="0"
              max="255"
              className={styles.input}
            />
          </div>
        ))}
        <p>Total EVs: {totalEvs}</p>
      </div>
    </div>
  );
}
