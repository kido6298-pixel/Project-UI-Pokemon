const { evaluatePokemon } = require('./board_value');

function damageDistribution(rolls, accuracy = 1) {
    if (!Array.isArray(rolls) || !rolls.length ||
        rolls.some(d => !Number.isFinite(d) || d < 0)) {
        throw new Error('Invalid damage rolls');
    }

    if (!(accuracy >= 0 && accuracy <= 1)) {
        throw new Error('Invalid accuracy');
    }

    const distribution = new Map();

    for (const damage of rolls) {
        distribution.set(
            damage,
            (distribution.get(damage) || 0) +
            accuracy / rolls.length
        );
    }

    if (accuracy < 1) {
        distribution.set(
            0,
            (distribution.get(0) || 0) + 1 - accuracy
        );
    }

    return [...distribution.entries()]
        .filter(([, probability]) => probability > 0)
        .map(([damage, probability]) => ({
            damage,
            probability
        }));
}

function evaluateAttackTurn({
    own,
    enemy,
    ownRolls,
    enemyRolls,
    ownAccuracy = 1,
    enemyAccuracy = 1,
    firstChance = 1
}) {
    if (!(firstChance >= 0 && firstChance <= 1)) {
        throw new Error('Invalid firstChance');
    }

    for (const p of [own, enemy]) {
        if (!(p.currentHP > 0 &&
              p.maxHP >= p.currentHP)) {
            throw new Error('Invalid Pokemon HP');
        }
    }

    const ownDamage = damageDistribution(
        ownRolls, ownAccuracy
    );

    const enemyDamage = damageDistribution(
        enemyRolls, enemyAccuracy
    );

    function value(pokemon, hp) {
        return evaluatePokemon({
            species: pokemon.species,
            hpRatio: hp / pokemon.maxHP,
            status: pokemon.status,
            fainted: hp === 0
        });
    }

    const initialValue =
        value(own, own.currentHP) -
        value(enemy, enemy.currentHP);

    const outcomes = new Map();

    for (const ownFirst of [true, false]) {
        const orderProbability = ownFirst
            ? firstChance
            : 1 - firstChance;

        if (orderProbability === 0) continue;

        for (const attack of ownDamage) {
            for (const counter of enemyDamage) {
                let ownHP = own.currentHP;
                let enemyHP = enemy.currentHP;

                if (ownFirst) {
                    enemyHP = Math.max(
                        0, enemyHP - attack.damage
                    );

                    if (enemyHP > 0) {
                        ownHP = Math.max(
                            0, ownHP - counter.damage
                        );
                    }
                } else {
                    ownHP = Math.max(
                        0, ownHP - counter.damage
                    );

                    if (ownHP > 0) {
                        enemyHP = Math.max(
                            0, enemyHP - attack.damage
                        );
                    }
                }

                const probability =
                    orderProbability *
                    attack.probability *
                    counter.probability;

                const key = ownHP + ':' + enemyHP;

                if (!outcomes.has(key)) {
                    outcomes.set(key, {
                        ownHP,
                        enemyHP,
                        probability: 0
                    });
                }

                outcomes.get(key).probability += probability;
            }
        }
    }

    const result = {
        initialValue,
        expectedValue: 0,
        expectedOwnHP: 0,
        expectedEnemyHP: 0,
        ownKOChance: 0,
        enemyKOChance: 0,
        probabilitySum: 0
    };

    for (const outcome of outcomes.values()) {
        const {ownHP, enemyHP, probability} = outcome;

        result.expectedValue += probability * (
            value(own, ownHP) -
            value(enemy, enemyHP)
        );

        result.expectedOwnHP += ownHP * probability;
        result.expectedEnemyHP += enemyHP * probability;

        if (ownHP === 0) {
            result.ownKOChance += probability;
        }

        if (enemyHP === 0) {
            result.enemyKOChance += probability;
        }

        result.probabilitySum += probability;
    }

    result.expectedChange =
        result.expectedValue - initialValue;

    result.outcomes = [...outcomes.values()];

    return result;
}

module.exports = {
    damageDistribution,
    evaluateAttackTurn
};
