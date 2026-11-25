const { Dex } = require('pokemon-showdown');

const dex = Dex.mod('gen4');

function buildOwnConfig(pokemon, observed = {}) {
    const species = pokemon.details.split(',')[0];
    const baseStats = {...dex.species.get(species).baseStats};

    const hp = pokemon.condition.match(/^(\d+)\/(\d+)/);

    if (!hp) {
        throw new Error('Invalid active Pokemon HP');
    }

    const currentHP = Number(hp[1]);
    const maxHP = Number(hp[2]);

    baseStats.hp = maxHP - 75;

    for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
        if (!Number.isFinite(pokemon.stats?.[stat])) {
            throw new Error('Missing stat: ' + stat);
        }

        baseStats[stat] = pokemon.stats[stat] - 20;
    }

    return {
        species,
        level: 50,
        nature: 'Hardy',
        ability: dex.abilities.get(
            pokemon.ability || pokemon.baseAbility || ''
        ).name,
        item: pokemon.item
            ? dex.items.get(pokemon.item).name
            : '',
        status: pokemon.condition.split(' ')[1] || '',
        boosts: observed.boosts || {},
        evs: {},
        ivs: {
            hp: 31, atk: 31, def: 31,
            spa: 31, spd: 31, spe: 31
        },
        curHP: currentHP,
        overrides: {baseStats}
    };
}

module.exports = { buildOwnConfig };
