const { Dex } = require('pokemon-showdown');
const { predictDamage } = require('./damage');
const { predictOrder } = require('./speed');

const dex = Dex.mod('gen4');

function predictThreat({
    own,
    enemy,
    enemyMoves,
    ownMove,
    field = {},
    trickRoom = false
}) {
    const threats = [];

    for (const name of enemyMoves) {
        const move = dex.moves.get(name);

        if (!move.exists || move.category === 'Status') {
            continue;
        }

        const damage = predictDamage({
            attacker: enemy,
            defender: own,
            move: move.name,
            field
        });

        const order = predictOrder({
            attacker: enemy,
            defender: own,
            attackerPriority: move.priority,
            defenderPriority: dex.moves.get(ownMove).priority,
            trickRoom
        });

        const accuracy = move.accuracy === true
            ? 1
            : move.accuracy / 100;

        const koChance = damage.koChance;
        const hitKOChance = koChance === null
            ? null
            : koChance * accuracy;

        const beforeActionKO = hitKOChance === null
            ? null
            : hitKOChance * order.firstChance;

        threats.push({
            move: move.name,
            minDamage: damage.min,
            maxDamage: damage.max,
            averageDamage: damage.average,
            enemyFirstChance: order.firstChance,
            koChance: hitKOChance,
            beforeActionKO,
            actionChance: beforeActionKO === null
                ? null
                : 1 - beforeActionKO
        });
    }

    threats.sort((a, b) =>
        (b.beforeActionKO ?? -1) -
        (a.beforeActionKO ?? -1) ||
        b.maxDamage - a.maxDamage
    );

    return {
        threats,
        worstThreat: threats[0] || null
    };
}

module.exports = { predictThreat };
