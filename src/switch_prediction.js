const { Dex } = require('pokemon-showdown');
const { evaluatePokemon } = require('./board_value');
const { evaluateHazards } = require('./hazards');
const { predictDamage } = require('./damage');
const { damageDistribution } = require('./attack_turn');

const dex = Dex.mod('gen4');

function predictSwitchTurn({
    candidate,
    enemy,
    enemyMove,
    conditions = {},
    defenseField = {},
    hazardField = {},
    forced = false
}) {
    const hazards = evaluateHazards(
        candidate,
        conditions,
        hazardField
    );

    const status = ['psn', 'tox'].includes(hazards.toxicSpikes)
        ? hazards.toxicSpikes
        : candidate.status;

    function value(hp, currentStatus) {
        return evaluatePokemon({
            species: candidate.species,
            hpRatio: hp / hazards.maxHP,
            status: currentStatus,
            fainted: hp === 0
        });
    }

    const initialValue = value(
        hazards.currentHP,
        candidate.status
    );

    let incoming = null;
    let distribution = [
        {damage: 0, probability: 1}
    ];

    if (!forced && !hazards.faintedOnEntry) {
        const move = dex.moves.get(enemyMove);

        if (!move.exists || move.category === 'Status') {
            throw new Error(
                'Unsupported enemy move: ' + enemyMove
            );
        }

        incoming = predictDamage({
            attacker: enemy,
            defender: {
                ...candidate,
                curHP: hazards.remainingHP,
                status,
                boosts: {}
            },
            move: move.name,
            field: defenseField
        });

        if (!incoming.rolls) {
            throw new Error(
                'Unsupported damage distribution'
            );
        }

        const accuracy = move.accuracy === true
            ? 1
            : move.accuracy / 100;

        distribution = damageDistribution(
            incoming.rolls,
            accuracy
        );
    }

    const outcomes = new Map();

    for (const outcome of distribution) {
        const remainingHP = Math.max(
            0,
            hazards.remainingHP - outcome.damage
        );

        if (!outcomes.has(remainingHP)) {
            outcomes.set(remainingHP, {
                remainingHP,
                status: remainingHP > 0 ? status : null,
                probability: 0
            });
        }

        outcomes.get(remainingHP).probability +=
            outcome.probability;
    }

    const result = {
        species: candidate.species,
        forced,
        hazards,
        incoming,
        initialValue,
        expectedValue: 0,
        expectedRemainingHP: 0,
        koChance: 0,
        probabilitySum: 0
    };

    for (const outcome of outcomes.values()) {
        const {remainingHP, probability} = outcome;

        result.expectedValue +=
            value(remainingHP, status) * probability;

        result.expectedRemainingHP +=
            remainingHP * probability;

        if (remainingHP === 0) {
            result.koChance += probability;
        }

        result.probabilitySum += probability;
    }

    result.expectedChange =
        result.expectedValue - initialValue;

    result.outcomes = [...outcomes.values()];

    return result;
}

module.exports = { predictSwitchTurn };
