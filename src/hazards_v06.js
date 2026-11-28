const { Dex } = require('pokemon-showdown');
const { Generations, Pokemon } = require('@smogon/calc');

const dex = Dex.mod('gen4');
const gen = Generations.get(4);

function evaluateHazards(candidate, conditions = {}, field = {}) {
    const {species, ...options} = candidate;

    const pokemon = new Pokemon(gen, species, {
        level: 50,
        ...options
    });

    const maxHP = pokemon.maxHP();
    const currentHP = pokemon.curHP();

    const types = dex.species.get(species).types;
    const ability = dex.abilities.get(candidate.ability || '').id;
    const item = dex.items.get(candidate.item || '').id;

    const grounded = field.gravity ||
        item === 'ironball' ||
        (!types.includes('Flying') && ability !== 'levitate');

    const magicGuard = ability === 'magicguard';

    let stealthRock = 0;
    let spikes = 0;
    let toxicSpikes = null;

    if (conditions['Stealth Rock'] && !magicGuard) {
        const effectiveness = Math.pow(
            2,
            dex.getEffectiveness('Rock', types)
        );

        stealthRock = Math.max(
            1,
            Math.floor(maxHP * effectiveness / 8)
        );
    }

    const spikeLayers = Math.min(
        3,
        Math.max(0, Number(conditions.Spikes) || 0)
    );

    if (grounded && spikeLayers && !magicGuard) {
        const divisor = [0, 8, 6, 4][spikeLayers];

        spikes = Math.max(
            1,
            Math.floor(maxHP / divisor)
        );
    }

    const toxicLayers = Math.min(
        2,
        Math.max(0, Number(conditions['Toxic Spikes']) || 0)
    );

    if (grounded && toxicLayers) {
        if (types.includes('Poison')) {
            toxicSpikes = 'absorb';
        } else if (
            !types.includes('Steel') &&
            ability !== 'immunity' && !magicGuard &&
            !candidate.status
        ) {
            toxicSpikes = toxicLayers === 2 ? 'tox' : 'psn';
        }
    }

    const totalDamage = stealthRock + spikes;
    const remainingHP = Math.max(0, currentHP - totalDamage);

    return {
        species,
        maxHP,
        currentHP,
        grounded: !!grounded,
        stealthRock,
        spikes,
        toxicSpikes,
        totalDamage,
        remainingHP,
        damagePercent: totalDamage / maxHP * 100,
        faintedOnEntry: remainingHP === 0
    };
}

module.exports = { evaluateHazards };
