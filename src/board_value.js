const DEFAULT_WEIGHTS = {
    alive: 1.0,
    hp: 0.5,
    status: {
        brn: 0.15,
        par: 0.20,
        psn: 0.10,
        tox: 0.20,
        slp: 0.25,
        frz: 0.30
    }
};

function evaluatePokemon(pokemon, weights = DEFAULT_WEIGHTS) {
    if (pokemon.fainted || pokemon.hpRatio <= 0) {
        return 0;
    }

    const hp = Math.max(0, Math.min(1, pokemon.hpRatio));

    const statusPenalty =
        weights.status[pokemon.status] || 0;

    return Math.max(
        0,
        weights.alive +
        weights.hp * hp -
        statusPenalty
    );
}

function evaluateTeam(team, weights = DEFAULT_WEIGHTS) {
    const members = team.map(pokemon => ({
        species: pokemon.species,
        value: evaluatePokemon(pokemon, weights)
    }));

    return {
        alive: team.filter(
            p => !p.fainted && p.hpRatio > 0
        ).length,
        value: members.reduce(
            (sum, p) => sum + p.value, 0
        ),
        members
    };
}

function evaluateBoard({
    own,
    enemy,
    weights = DEFAULT_WEIGHTS
}) {
    const ownValue = evaluateTeam(own, weights);
    const enemyValue = evaluateTeam(enemy, weights);

    return {
        own: ownValue,
        enemy: enemyValue,
        advantage: ownValue.value - enemyValue.value
    };
}

module.exports = {
    DEFAULT_WEIGHTS,
    evaluatePokemon,
    evaluateTeam,
    evaluateBoard
};
