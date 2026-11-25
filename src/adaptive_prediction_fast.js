const { predictAttackTurn } = require('./attack_prediction_fast');
const { predictSwitchTurn } = require('./switch_prediction');

function aggregate(values, riskWeight) {
    const average = values.reduce(
        (sum, value) => sum + value, 0
    ) / values.length;

    const worst = Math.min(...values);

    return {
        average,
        worst,
        score:
            average * (1 - riskWeight) +
            worst * riskWeight
    };
}

function evaluateAdaptiveAction({
    own,
    enemy,
    ownMove,
    ownMoves = [ownMove],
    enemyMoves,
    candidate,
    candidateMoves = [],
    conditions = {},
    attackField = {},
    defenseField = {},
    trickRoom = false,
    riskWeight = 0.5,
    discount = 1,
    calculations
}) {
    if (!enemyMoves?.length) {
        throw new Error('No enemy moves');
    }

    if (!(riskWeight >= 0 && riskWeight <= 1)) {
        throw new Error('Invalid risk weight');
    }

    if (!(discount >= 0 && discount <= 1)) {
        throw new Error('Invalid discount');
    }

    const threats = [...new Set(enemyMoves)];
    const active = candidate || own;

    const moves = [...new Set(
        candidate ? candidateMoves : ownMoves
    )];

    if (!moves.length) {
        throw new Error('No followup moves');
    }

    const fieldOptions = {
        attackField,
        defenseField,
        trickRoom,
        calculations
    };

    const isChoice = pokemon =>
        /^choice(band|scarf|specs)$/i.test(
            (pokemon.item || '').replace(/\s/g, '')
        );

    const results = [];
    let evaluations = 0;
    const cache = new Map();

    for (const enemyMove of threats) {
        const first = candidate
            ? predictSwitchTurn({
                candidate,
                enemy,
                enemyMove,
                conditions,
                defenseField
            })
            : predictAttackTurn({
                own,
                enemy,
                ownMove,
                enemyMove,
                ...fieldOptions
            });

        let secondChange = 0;
        let terminalProbability = 0;
        const followups = {};

        for (const outcome of first.outcomes) {
            const ownHP = candidate
                ? outcome.remainingHP
                : outcome.ownHP;

            const enemyHP = candidate
                ? enemy.curHP
                : outcome.enemyHP;

            if (ownHP === 0 || enemyHP === 0) {
                terminalProbability += outcome.probability;
                continue;
            }

            const nextOwn = {
                ...active,
                curHP: ownHP
            };

            if (candidate) {
                nextOwn.boosts = {};
                nextOwn.status = outcome.status || '';
            }

            const nextEnemy = {
                ...enemy,
                ...(enemyHP !== undefined
                    ? {curHP: enemyHP}
                    : {})
            };

            const availableMoves =
                !candidate && isChoice(own)
                    ? [ownMove]
                    : moves;

            const nextThreats = isChoice(enemy)
                ? [enemyMove]
                : threats;

            let best = null;

            for (const move of availableMoves) {
                const values = [];

                for (const counter of nextThreats) {
                    const key = JSON.stringify([
                        nextOwn,
                        nextEnemy,
                        move,
                        counter
                    ]);

                    let value = cache.get(key);

                    if (value === undefined) {
                        value = predictAttackTurn({
                            own: nextOwn,
                            enemy: nextEnemy,
                            ownMove: move,
                            enemyMove: counter,
                            ...fieldOptions
                        }).expectedChange;

                        cache.set(key, value);
                        evaluations++;
                    }

                    values.push(value);
                }

                const evaluation = aggregate(
                    values,
                    riskWeight
                );

                if (!best ||
                    evaluation.score > best.score) {
                    best = {
                        move,
                        ...evaluation
                    };
                }
            }

            secondChange +=
                best.score * outcome.probability;

            followups[best.move] =
                (followups[best.move] || 0) +
                outcome.probability;
        }

        results.push({
            enemyMove,
            firstChange: first.expectedChange,
            secondChange,
            totalChange:
                first.expectedChange +
                secondChange * discount,
            terminalProbability,
            followups
        });
    }

    return {
        action: candidate
            ? 'Switch to ' + candidate.species
            : ownMove,
        ...aggregate(
            results.map(r => r.totalChange),
            riskWeight
        ),
        evaluations,
        results
    };
}

module.exports = {
    evaluateAdaptiveAction
};


