const { Dex } = require('pokemon-showdown');
const { predictDamage } = require('./damage');
const { predictOrder } = require('./speed');
const { evaluateAttackTurn } = require('./attack_turn');

const dex = Dex.mod('gen4');

function predictAttackTurn({
    own,
    enemy,
    ownMove,
    enemyMove,
    attackField = {},
    defenseField = {},
    trickRoom = false,
    calculations
}) {
    const damage = calculations
        ? options => calculations.predictDamage(options)
        : predictDamage;

    const attack = dex.moves.get(ownMove);
    const counter = dex.moves.get(enemyMove);

    for (const move of [attack, counter]) {
        if (!move.exists || move.category === 'Status') {
            throw new Error('Unsupported move: ' + move.name);
        }
    }

    const outgoing = damage({
        attacker: own,
        defender: enemy,
        move: attack.name,
        field: attackField
    });

    const incoming = damage({
        attacker: enemy,
        defender: own,
        move: counter.name,
        field: defenseField
    });

    if (!outgoing.rolls || !incoming.rolls) {
        throw new Error('Unsupported damage distribution');
    }

    let order;

    if (calculations) {
        const attackerSpeed =
            calculations.effectiveSpeed(own);

        const defenderSpeed =
            calculations.effectiveSpeed(enemy);

        const speedTie =
            attackerSpeed === defenderSpeed;

        const firstChance =
            attack.priority !== counter.priority
                ? Number(attack.priority > counter.priority)
                : speedTie
                    ? 0.5
                    : Number(
                        trickRoom
                            ? attackerSpeed < defenderSpeed
                            : attackerSpeed > defenderSpeed
                    );

        order = {
            attackerSpeed,
            defenderSpeed,
            firstChance,
            speedTie,
            trickRoom
        };
    } else {
        order = predictOrder({
            attacker: own,
            defender: enemy,
            attackerPriority: attack.priority,
            defenderPriority: counter.priority,
            trickRoom
        });
    }

    const accuracy = move =>
        move.accuracy === true ? 1 : move.accuracy / 100;

    const result = evaluateAttackTurn({
        own: {
            species: own.species,
            currentHP: incoming.currentHP,
            maxHP: incoming.maxHP,
            status: own.status
        },
        enemy: {
            species: enemy.species,
            currentHP: outgoing.currentHP,
            maxHP: outgoing.maxHP,
            status: enemy.status
        },
        ownRolls: outgoing.rolls,
        enemyRolls: incoming.rolls,
        ownAccuracy: accuracy(attack),
        enemyAccuracy: accuracy(counter),
        firstChance: order.firstChance
    });

    return {
        ownMove: attack.name,
        enemyMove: counter.name,
        outgoing,
        incoming,
        order,
        ...result
    };
}

module.exports = { predictAttackTurn };

