const { Dex } = require('pokemon-showdown');
const { predictDamage } = require('./damage');

const dex = Dex.mod('gen4');

function evaluateSwitch({
    candidate,
    enemy,
    enemyMoves,
    field = {}
}) {
    const threats = [];

    for (const name of enemyMoves) {
        const move = dex.moves.get(name);

        if (!move.exists || move.category === 'Status') {
            continue;
        }

        const result = predictDamage({
            attacker: enemy,
            defender: candidate,
            move: move.name,
            field
        });

        const average =
            result.average ?? (result.min + result.max) / 2;

        threats.push({
            move: move.name,
            minDamage: result.min,
            maxDamage: result.max,
            averageDamage: average,
            damageRatio: average / result.currentHP,
            koChance: result.koChance,
            immune: result.immune
        });
    }

    threats.sort((a, b) =>
        (b.koChance ?? 1) - (a.koChance ?? 1) ||
        b.damageRatio - a.damageRatio
    );

    const worst = threats[0] || null;

    return {
        species: candidate.species,
        threats,
        worstThreat: worst,
        survivalChance: worst && worst.koChance !== null
            ? 1 - worst.koChance
            : null,
        safetyScore: worst
            ? Math.max(0, 1 - worst.damageRatio)
            : null
    };
}

module.exports = { evaluateSwitch };
