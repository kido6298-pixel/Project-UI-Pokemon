const { evaluateTwoTurns } = require('./two_turn_prediction');

function evaluateAction({
    enemyMoves,
    riskWeight = 0.5,
    ...options
}) {
    if (!enemyMoves?.length) {
        throw new Error('No known enemy moves');
    }

    if (!(riskWeight >= 0 && riskWeight <= 1)) {
        throw new Error('Invalid risk weight');
    }

    const results = [...new Set(enemyMoves)].map(enemyMove => ({
        enemyMove,
        ...evaluateTwoTurns({
            ...options,
            enemyMove
        })
    }));

    const average = results.reduce(
        (sum, r) => sum + r.totalChange, 0
    ) / results.length;

    const worst = results.reduce(
        (a, b) => a.totalChange <= b.totalChange ? a : b
    );

    const best = results.reduce(
        (a, b) => a.totalChange >= b.totalChange ? a : b
    );

    const score =
        average * (1 - riskWeight) +
        worst.totalChange * riskWeight;

    return {
        action: results[0].action,
        average,
        worst: worst.totalChange,
        best: best.totalChange,
        worstMove: worst.enemyMove,
        bestMove: best.enemyMove,
        riskWeight,
        score,
        results
    };
}

module.exports = { evaluateAction };
