const { evaluatePokemon } = require('./board_value');

const {
    damageDistribution,
    evaluateAttackTurn: originalEvaluateAttackTurn
} = require('./attack_turn');

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

    // Preserve original behavior for unusual inputs.
    if (
        ![own.currentHP, own.maxHP,
          enemy.currentHP, enemy.maxHP]
            .every(Number.isSafeInteger) ||
        !Number.isSafeInteger(
            (own.maxHP + 1) * (enemy.maxHP + 1)
        ) ||
        !Array.isArray(ownRolls) ||
        !Array.isArray(enemyRolls) ||
        !ownRolls.every(Number.isSafeInteger) ||
        !enemyRolls.every(Number.isSafeInteger)
    ) {
        return originalEvaluateAttackTurn({
            own,
            enemy,
            ownRolls,
            enemyRolls,
            ownAccuracy,
            enemyAccuracy,
            firstChance
        });
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

    const ownInitialValue =
        value(own, own.currentHP);

    const enemyInitialValue =
        value(enemy, enemy.currentHP);

    const initialValue =
        ownInitialValue - enemyInitialValue;

    const ownValues = new Map([
        [own.currentHP, ownInitialValue]
    ]);

    const enemyValues = new Map([
        [enemy.currentHP, enemyInitialValue]
    ]);

    const attacks = ownDamage.map(attack => {
        const hp = Math.max(
            0, enemy.currentHP - attack.damage
        );

        if (!enemyValues.has(hp)) {
            enemyValues.set(hp,value(enemy,hp));
        }

        return {
            hp,
            probability: attack.probability
        };
    });

    const counters = enemyDamage.map(counter => {
        const hp = Math.max(
            0, own.currentHP - counter.damage
        );

        if (!ownValues.has(hp)) {
            ownValues.set(hp,value(own,hp));
        }

        return {
            hp,
            probability: counter.probability
        };
    });

    const stride = enemy.maxHP + 1;
    const outcomes = new Map();

    for (const ownFirst of [true,false]) {
        const orderProbability = ownFirst
            ? firstChance
            : 1 - firstChance;

        if (orderProbability === 0) continue;

        for (const attack of attacks) {
            const attackProbability =
                orderProbability * attack.probability;

            for (const counter of counters) {
                const ownHP =
                    ownFirst && attack.hp === 0
                        ? own.currentHP
                        : counter.hp;

                const enemyHP =
                    !ownFirst && counter.hp === 0
                        ? enemy.currentHP
                        : attack.hp;

                const probability =
                    attackProbability *
                    counter.probability;

                const key =
                    ownHP * stride + enemyHP;

                const existing = outcomes.get(key);

                if (existing === undefined) {
                    outcomes.set(key,{
                        ownHP,
                        enemyHP,
                        probability
                    });
                } else {
                    existing.probability += probability;
                }
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
        const {ownHP,enemyHP,probability} = outcome;

        result.expectedValue += probability * (
            ownValues.get(ownHP) -
            enemyValues.get(enemyHP)
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
