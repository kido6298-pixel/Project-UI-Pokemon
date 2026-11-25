const { Generations, Pokemon } = require('@smogon/calc');

const gen = Generations.get(4);

function effectiveSpeed(config) {
    const {
        species,
        ...options
    } = config;

    const pokemon = new Pokemon(gen, species, {
        level: 50,
        ...options
    });

    let speed = pokemon.rawStats.spe;
    const boost = pokemon.boosts.spe || 0;

    speed = Math.floor(
        speed * (boost >= 0
            ? (2 + boost) / 2
            : 2 / (2 - boost))
    );

    if (pokemon.item === 'Choice Scarf') {
        speed = Math.floor(speed * 1.5);
    }

    if (pokemon.status === 'par' &&
        pokemon.ability !== 'Quick Feet') {
        speed = Math.floor(speed / 4);
    }

    if (pokemon.ability === 'Quick Feet' &&
        pokemon.status) {
        speed = Math.floor(speed * 1.5);
    }

    return Math.max(1, speed);
}

function predictOrder({
    attacker,
    defender,
    attackerPriority = 0,
    defenderPriority = 0,
    trickRoom = false
}) {
    const attackerSpeed = effectiveSpeed(attacker);
    const defenderSpeed = effectiveSpeed(defender);

    let firstChance;

    if (attackerPriority !== defenderPriority) {
        firstChance =
            attackerPriority > defenderPriority ? 1 : 0;
    } else if (attackerSpeed === defenderSpeed) {
        firstChance = 0.5;
    } else {
        firstChance = (
            trickRoom
                ? attackerSpeed < defenderSpeed
                : attackerSpeed > defenderSpeed
        ) ? 1 : 0;
    }

    return {
        attackerSpeed,
        defenderSpeed,
        firstChance,
        speedTie: attackerSpeed === defenderSpeed,
        trickRoom
    };
}

function predictOrderScenarios({
    attacker,
    defender,
    scenarios,
    ...options
}) {
    return scenarios.map(scenario => ({
        name: scenario.name,
        ...predictOrder({
            ...options,
            attacker,
            defender: {
                ...defender,
                ...scenario.options
            }
        })
    }));
}

module.exports = {
    effectiveSpeed,
    predictOrder,
    predictOrderScenarios
};
