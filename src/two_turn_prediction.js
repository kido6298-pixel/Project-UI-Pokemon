const { predictAttackTurn } = require('./attack_prediction');
const { predictSwitchTurn } = require('./switch_prediction');

function bestFollowup({
    own,
    enemy,
    ownMoves,
    enemyMove,
    attackField,
    defenseField,
    trickRoom
}) {
    let best = null;

    for (const ownMove of ownMoves) {
        const result = predictAttackTurn({
            own,
            enemy,
            ownMove,
            enemyMove,
            attackField,
            defenseField,
            trickRoom
        });

        if (!best ||
            result.expectedChange > best.expectedChange) {
            best = result;
        }
    }

    return best;
}

function evaluateTwoTurns({
    own,
    enemy,
    ownMove,
    ownMoves = [ownMove],
    enemyMove,
    candidate,
    candidateMoves = [],
    conditions = {},
    attackField = {},
    defenseField = {},
    trickRoom = false,
    discount = 1
}) {
    const common = {
        enemyMove,
        attackField,
        defenseField,
        trickRoom
    };

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
            ...common
        });

    const active = candidate || own;
    const moves = candidate ? candidateMoves : ownMoves;

    let secondChange = 0;
    let terminalProbability = 0;
    let evaluatedBranches = 0;

    const followupMoves = {};

    for (const outcome of first.outcomes) {
        const ownHP = candidate
            ? outcome.remainingHP
            : outcome.ownHP;

        const enemyHP = candidate
            ? enemy.curHP ?? first.incoming?.maxHP
            : outcome.enemyHP;

        if (ownHP === 0 ||
            (!candidate && enemyHP === 0)) {
            terminalProbability += outcome.probability;
            continue;
        }

        const nextOwn = {
            ...active,
            curHP: ownHP
        };

        if (candidate) {
            nextOwn.boosts = {};
            nextOwn.status = outcome.status;
        }

        const nextEnemy = candidate
            ? {...enemy}
            : {...enemy, curHP: enemyHP};

        const followup = bestFollowup({
            own: nextOwn,
            enemy: nextEnemy,
            ownMoves: moves,
            ...common
        });

        if (!followup) continue;

        secondChange +=
            followup.expectedChange *
            outcome.probability;

        followupMoves[followup.ownMove] =
            (followupMoves[followup.ownMove] || 0) +
            outcome.probability;

        evaluatedBranches++;
    }

    return {
        action: candidate
            ? 'Switch to ' + candidate.species
            : ownMove,
        firstChange: first.expectedChange,
        secondChange,
        totalChange:
            first.expectedChange +
            secondChange * discount,
        terminalProbability,
        evaluatedBranches,
        followupMoves
    };
}

module.exports = {
    bestFollowup,
    evaluateTwoTurns
};
