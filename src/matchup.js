const { Dex } = require('pokemon-showdown');
const { predictDamage } = require('./damage');
const { predictThreat } = require('./threat');
const { predictOrder } = require('./speed');

const dex = Dex.mod('gen4');

function evaluateMatchup({
    own,
    enemy,
    ownMoves,
    enemyMoves = [],
    enemyHPPercent = 100,
    attackField = {},
    defenseField = {},
    trickRoom = false
}) {
    const candidates = [];

    for (const name of ownMoves) {
        const move = dex.moves.get(name);

        if (!move.exists || move.category === 'Status') {
            continue;
        }

        const damage = predictDamage({
            attacker: own,
            defender: enemy,
            move: move.name,
            field: attackField
        });

        const enemyHP = Math.max(
            1,
            Math.ceil(damage.maxHP * enemyHPPercent / 100)
        );

        const average =
            damage.average ?? (damage.min + damage.max) / 2;

        const accuracy = move.accuracy === true
            ? 1
            : move.accuracy / 100;

        const koChance = damage.rolls
            ? damage.rolls.filter(
                d => d >= enemyHP
            ).length / damage.rolls.length * accuracy
            : null;

        const order = predictOrder({
            attacker: own,
            defender: enemy,
            attackerPriority: move.priority,
            defenderPriority: 0,
            trickRoom
        });

        const threat = predictThreat({
            own,
            enemy,
            enemyMoves,
            ownMove: move.name,
            field: defenseField,
            trickRoom
        });

        const worst = threat.worstThreat;

        const risk = worst?.beforeActionKO ?? null;
        const actionChance = risk === null ? 1 : 1 - risk;

        const attackScore = accuracy *
            Math.min(average / enemyHP, 1) +
            (koChance ?? 0);

        const score = attackScore * actionChance;

        candidates.push({
            move: move.name,
            minDamage: damage.min,
            maxDamage: damage.max,
            damageRatio: average / enemyHP,
            koChance,
            firstChance: order.firstChance,
            incomingMaxDamage: worst?.maxDamage ?? null,
            beforeActionKO: risk,
            actionChance,
            threatKnown: risk !== null,
            attackScore,
            score
        });
    }

    candidates.sort((a, b) =>
        b.score - a.score ||
        b.attackScore - a.attackScore
    );

    return {
        species: own.species,
        candidates,
        bestMove: candidates[0] || null,
        score: candidates[0]?.score ?? 0
    };
}

module.exports = { evaluateMatchup };
