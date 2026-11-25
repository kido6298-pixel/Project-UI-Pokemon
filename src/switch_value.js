const { evaluateHazards } = require('./hazards');
const { evaluateSwitch } = require('./switch_evaluation');
const { evaluateMatchup } = require('./matchup');

function evaluateSwitchValue({
    candidate,
    candidateMoves,
    enemy,
    enemyMoves = [],
    enemyHPPercent = 100,
    conditions = {},
    attackField = {},
    defenseField = {},
    trickRoom = false,
    forced = false
}) {
    const hazards = evaluateHazards(
        candidate,
        conditions
    );

    const rejected = reason => ({
        species: candidate.species,
        score: 0,
        rejected: true,
        reason,
        hazards
    });

    if (hazards.faintedOnEntry) {
        return rejected('Entry hazard knockout');
    }

    const afterEntry = {
        ...candidate,
        curHP: hazards.remainingHP,
        status: ['psn', 'tox'].includes(hazards.toxicSpikes)
            ? hazards.toxicSpikes
            : candidate.status,
        boosts: {}
    };

    const incoming = forced
        ? null
        : evaluateSwitch({
            candidate: afterEntry,
            enemy,
            enemyMoves,
            field: defenseField
        });

    const worst = incoming?.worstThreat;

    const survivalChance = forced
        ? 1
        : incoming?.survivalChance ?? null;

    if (survivalChance === 0) {
        return rejected('Incoming attack knockout');
    }

    const expectedDamage = worst
        ? worst.averageDamage
        : 0;

    const remainingHP = Math.max(
        1,
        Math.floor(
            hazards.remainingHP - expectedDamage
        )
    );

    const matchup = evaluateMatchup({
        own: {
            ...afterEntry,
            curHP: remainingHP
        },
        enemy,
        ownMoves: candidateMoves,
        enemyMoves,
        enemyHPPercent,
        attackField,
        defenseField,
        trickRoom
    });

    const hpRatio = remainingHP / hazards.maxHP;

    const hpCost = Math.max(
        0,
        (hazards.currentHP - remainingHP) /
        hazards.maxHP
    );

    const uncertaintyPenalty =
        !forced && survivalChance === null
            ? 0.75
            : 1;

    const statusPenalty =
        ['psn', 'tox'].includes(hazards.toxicSpikes)
            ? 0.85
            : 1;

    const score =
        matchup.score *
        (survivalChance ?? 1) *
        (0.5 + 0.5 * hpRatio) *
        (1 - 0.5 * hpCost) *
        uncertaintyPenalty *
        statusPenalty;

    return {
        species: candidate.species,
        score,
        rejected: false,
        forced,
        hazards,
        incoming,
        survivalChance,
        remainingHP,
        hpRatio,
        hpCost,
        matchup,
        bestMove: matchup.bestMove?.move ?? null
    };
}

module.exports = { evaluateSwitchValue };
