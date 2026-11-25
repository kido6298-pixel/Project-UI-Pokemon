const assert = require('node:assert/strict');
const { predictAttackTurn } = require('../src/attack_prediction');

const garchomp = {
    species: 'Garchomp',
    nature: 'Jolly',
    evs: {atk: 252, spe: 252},
    curHP: 100
};

const starmie = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252},
    curHP: 90
};

const scenarios = [
    {
        name: 'Normal',
        own: garchomp,
        enemy: starmie,
        ownMove: 'Earthquake',
        enemyMove: 'Ice Beam'
    },
    {
        name: 'Choice Scarf',
        own: {...garchomp, item: 'Choice Scarf'},
        enemy: starmie,
        ownMove: 'Earthquake',
        enemyMove: 'Ice Beam'
    },
    {
        name: 'Trick Room',
        own: garchomp,
        enemy: starmie,
        ownMove: 'Earthquake',
        enemyMove: 'Ice Beam',
        trickRoom: true
    },
    {
        name: 'Priority move',
        own: {
            species: 'Scizor',
            ability: 'Technician',
            nature: 'Adamant',
            evs: {atk: 252}
        },
        enemy: {...starmie, curHP: 10},
        ownMove: 'Bullet Punch',
        enemyMove: 'Surf'
    },
    {
        name: 'Ground immunity',
        own: garchomp,
        enemy: {
            species: 'Zapdos',
            nature: 'Timid',
            evs: {spa: 252, spe: 252}
        },
        ownMove: 'Earthquake',
        enemyMove: 'Thunderbolt'
    }
];

const results = scenarios.map(s => ({
    name: s.name,
    ...predictAttackTurn(s)
}));

console.log('\n=== REAL POKEMON ATTACK PREDICTION ===');

console.table(results.map(r => ({
    Scenario: r.name,
    OwnMove: r.ownMove,
    EnemyMove: r.enemyMove,
    First: (r.order.firstChance * 100).toFixed(1) + '%',
    Damage: r.outgoing.min + '-' + r.outgoing.max,
    Incoming: r.incoming.min + '-' + r.incoming.max,
    OwnKO: (r.ownKOChance * 100).toFixed(1) + '%',
    EnemyKO: (r.enemyKOChance * 100).toFixed(1) + '%',
    BoardChange: r.expectedChange.toFixed(4)
})));

const get = name => results.find(r => r.name === name);

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

near(get('Normal').ownKOChance, 1);
near(get('Normal').enemyKOChance, 0);

near(get('Choice Scarf').order.firstChance, 1);
near(get('Choice Scarf').enemyKOChance, 1);
near(get('Choice Scarf').ownKOChance, 0);

near(get('Trick Room').order.firstChance, 1);
near(get('Trick Room').enemyKOChance, 1);

near(get('Priority move').order.firstChance, 1);
near(get('Priority move').enemyKOChance, 1);

near(get('Ground immunity').outgoing.max, 0);
near(get('Ground immunity').incoming.max, 0);
near(get('Ground immunity').expectedChange, 0);

for (const result of results) {
    near(result.probabilitySum, 1);
    assert.ok(Number.isFinite(result.expectedChange));
}

console.log('\nREAL ATTACK PREDICTION TEST: PASS');
