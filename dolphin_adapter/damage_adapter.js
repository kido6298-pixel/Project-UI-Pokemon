const { buildOwnConfig } = require('../src/pokemon_config');
const { predictDamage } = require('../src/damage');
const {
    FastHPCachedCalculations
} = require('../src/fast_hp_cached_calculations');

const HP_TYPES = new Set([
    'Fighting', 'Flying', 'Poison', 'Ground',
    'Rock', 'Bug', 'Ghost', 'Steel',
    'Fire', 'Water', 'Grass', 'Electric',
    'Psychic', 'Ice', 'Dragon', 'Dark'
]);

function validateHiddenPower(hp) {
    if (
        !hp ||
        !HP_TYPES.has(hp.type) ||
        !Number.isInteger(hp.power) ||
        hp.power < 30 ||
        hp.power > 70
    ) {
        throw new Error('Invalid Hidden Power metadata');
    }

    return {
        type: hp.type,
        power: hp.power
    };
}

function buildDolphinConfig(pokemon, observed = {}) {
    const config = buildOwnConfig(pokemon, observed);

    if (pokemon.moves.includes('hiddenpower')) {
        config.hiddenPower = validateHiddenPower(
            pokemon.hidden_power
        );
    }

    return config;
}

function resolveDamageOptions(options) {
    const {
        hiddenPower,
        ...attacker
    } = options.attacker;

    const {
        hiddenPower: defenderHP,
        ...defender
    } = options.defender;

    const resolved = {
        ...options,
        attacker,
        defender
    };

    const moveId = options.move
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (moveId === 'hiddenpower' && hiddenPower) {
        const hp = validateHiddenPower(hiddenPower);

        resolved.moveOptions = {
            ...options.moveOptions,
            overrides: {
                ...options.moveOptions?.overrides,
                type: hp.type,
                basePower: hp.power
            }
        };
    }

    return resolved;
}

function predictDolphinDamage(options) {
    return predictDamage(
        resolveDamageOptions(options)
    );
}

class DolphinCalculations extends FastHPCachedCalculations {
    predictDamage(options) {
        return super.predictDamage(
            resolveDamageOptions(options)
        );
    }
}

module.exports = {
    buildDolphinConfig,
    resolveDamageOptions,
    predictDolphinDamage,
    DolphinCalculations
};
