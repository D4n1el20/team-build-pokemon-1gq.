import styles from '../page.module.css';

export default function PokemonSearch({ searchTerm, onSearchChange, filteredPokemon, selectedPokemon, onPokemonSelect }) {
  return (
    <div className={styles.searchSection}>
      <h2>Selecionar Pokémon</h2>
      <input
        type="text"
        placeholder="Buscar Pokémon..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.pokemonList}>
        {filteredPokemon.map(pokemon => {
          const id = pokemon.url.split('/').filter(Boolean).pop();
          const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
          return (
            <div
              key={pokemon.name}
              onClick={() => onPokemonSelect(pokemon)}
              className={`${styles.pokemonItem} ${selectedPokemon?.name === pokemon.name ? styles.pokemonItemSelected : ''}`}
            >
              <img src={imageUrl} alt={pokemon.name} className={styles.pokemonImage} />
              <p>{pokemon.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
