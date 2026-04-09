import styles from '../page.module.css';

const statLabels = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  specialAttack: 'Ataque Especial',
  specialDefense: 'Defesa Especial',
  speed: 'Velocidade'
};

function getStatLabel(stat) {
  return statLabels[stat] || stat;
}

export default function PokemonDetails({
  selectedPokemon,
  level,
  moves,
  ability,
  item,
  ivs,
  evs,
  movesList,
  abilitiesList,
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

  const effective = calculateEffectiveStats(selectedPokemon);
  const totalEvs = Object.values(evs).reduce((sum, ev) => sum + ev, 0);

  return (
    <div className={styles.pokemonDetails}>
      <div className={`${styles.sectionHeader} ${styles.pokemonDetailsHeader}`}>
        <div className={styles.pokemonIdentity}>
          <h3 className={styles.pokemonTitle}>{selectedPokemon.name}</h3>
          <p className={styles.pokemonTypes}>Tipos: <span>{selectedPokemon.types.join(', ')}</span></p>
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={onChangePokemon} className={`${styles.button} ${styles.secondaryButton} ${styles.changeButton}`}>Trocar Pokemon</button>
          <button onClick={onClearPokemon} className={`${styles.button} ${styles.dangerButton} ${styles.deleteButton}`}>Remover Pokemon</button>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.pokemonVisualCard}>
          <img src={selectedPokemon.image} alt={selectedPokemon.name} className={styles.pokemonImageLarge} />
          <span className={styles.levelChip}>Lv. {level}</span>
        </div>

        <div className={styles.statsPanel}>
          <h4>Stats Efetivos</h4>
          <div className={styles.statsList}>
            {Object.entries(effective).map(([stat, value]) => (
              <div key={stat} className={styles.statRow}>
                <span className={styles.statLabel}>{getStatLabel(stat)}</span>
                <div className={styles.statTrack}>
                  <span
                    className={styles.statFill}
                    style={{ width: `${Math.min(100, Math.round((value / 300) * 100))}%` }}
                  />
                </div>
                <span className={styles.statValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.formsGrid}>
        <div className={`${styles.formCard} ${styles.movesSection}`}>
          <h4>Golpes</h4>
          <div className={styles.movesGrid}>
            {Array(4).fill().map((_, i) => (
              <input
                key={i}
                type="text"
                value={moves[i] || ''}
                onChange={(e) => onMoveChange(i, e.target.value)}
                placeholder={`Golpe ${i + 1}`}
                list="pokemon-moves-list"
                className={styles.control}
              />
            ))}
          </div>
          <datalist id="pokemon-moves-list">
            {movesList.map((move) => (
              <option key={move} value={move} />
            ))}
          </datalist>
        </div>

        <div className={`${styles.formCard} ${styles.abilitySection}`}>
          <h4>Habilidade</h4>
          <input
            type="text"
            value={ability || ''}
            onChange={(e) => onAbilityChange(e.target.value)}
            placeholder="Digite a habilidade"
            list="pokemon-abilities-list"
            className={styles.control}
          />
          <datalist id="pokemon-abilities-list">
            {abilitiesList.map((abilityName) => (
              <option key={abilityName} value={abilityName} />
            ))}
          </datalist>
        </div>

        <div className={`${styles.formCard} ${styles.itemSection}`}>
          <h4>Item Hold</h4>
          <input
            type="text"
            value={item || ''}
            onChange={(e) => onItemChange(e.target.value)}
            placeholder="Digite o item"
            list="pokemon-items-list"
            className={styles.control}
          />
          <datalist id="pokemon-items-list">
            {itemsList.map((itemName) => (
              <option key={itemName} value={itemName} />
            ))}
          </datalist>
        </div>

        <div className={`${styles.formCard} ${styles.levelSection}`}>
          <h4>Nivel</h4>
          <input
            type="number"
            value={level}
            onChange={(e) => onLevelChange(parseInt(e.target.value) || 50)}
            min="1"
            max="100"
            className={styles.input}
          />
        </div>

        <div className={`${styles.formCard} ${styles.ivsSection}`}>
          <h4>IVs (0-31)</h4>
          <div className={styles.statInputsGrid}>
            {Object.keys(ivs).map(stat => (
              <div key={stat} className={styles.statInputRow}>
                <label className={styles.statInputLabel}>{getStatLabel(stat)}</label>
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
        </div>

        <div className={`${styles.formCard} ${styles.evsSection}`}>
          <h4>EVs (0-255, total max 510)</h4>
          <div className={styles.statInputsGrid}>
            {Object.keys(evs).map(stat => (
              <div key={stat} className={styles.statInputRow}>
                <label className={styles.statInputLabel}>{getStatLabel(stat)}</label>
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
          </div>
          <p className={styles.totalEvs}>Total EVs: {totalEvs}</p>
        </div>
      </div>
    </div>
  );
}
