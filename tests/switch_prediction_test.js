const assert = require('node:assert/strict');
const { predictSwitchTurn } = require('../src/switch_prediction');
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

const snorlax = {
    species: 'Snorlax',
    ability: 'Thick Fat',
    nature: 'Careful',
    evs: {hp: 252, spd: 252}
};

const metagross = {
    species: 'Metagross',
    nature: 'Adamant',
    evs: {hp: 252, atk: 252}
};

const common = {
    enemy: starmie,
    enemyMove: 'Ice Beam'
};

const attack = predictAttackTurn({
    own: garchomp,
    enemy: starmie,
    ownMove: 'Earthquake',
    enemyMove: 'Ice Beam'
});

const scenarios = [
    ['Snorlax switch', {
        candidate: snorlax
    }],
    ['Metagross switch', {
        candidate: metagross
    }],
    ['Snorlax with hazards', {
        candidate: snorlax,
        conditions: {
            'Stealth Rock': 1,
            'Spikes': 3,
            'Toxic Spikes': 2
        }
    }],
    ['Forced replacement', {
        candidate: snorlax,
        forced: true
    }],
    ['Unsafe switch', {
        candidate: garchomp
    }],
    ['Entry hazard KO', {
        candidate: {
            species: 'Charizard',
            curHP: 1
        },
        conditions: {
            'Stealth Rock': 1
        }
    }]
];

const results = scenarios.map(([name, options]) => ({
    name,
    ...predictSwitchTurn({
        ...common,
        ...options
    })
}));

console.log('\n=== SWITCH TURN PREDICTION ===');

console.table(results.map(r => ({
    Scenario: r.name,
    HazardDamage: r.hazards.totalDamage,
    ExpectedHP: r.expectedRemainingHP.toFixed(2),
    KO: (r.koChance * 100).toFixed(2) + '%',
    BoardChange: r.expectedChange.toFixed(4),
    Probability: r.probabilitySum.toFixed(6)
})));

const get = name => results.find(r => r.name === name);

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

near(get('Snorlax switch').koChance, 0);
near(get('Metagross switch').koChance, 0);
near(get('Unsafe switch').koChance, 1);
near(get('Entry hazard KO').koChance, 1);
near(get('Forced replacement').expectedChange, 0);

assert.ok(
    get('Snorlax with hazards').expectedChange <
    get('Snorlax switch').expectedChange
);

assert.ok(
    get('Snorlax switch').expectedChange >
    attack.expectedChange
);

for (const result of results) {
    near(result.probabilitySum, 1);
    assert.ok(Number.isFinite(result.expectedChange));
}

console.log('\n=== ATTACK VS SWITCH ===');

console.table([
    {
        Action: 'Garchomp Earthquake',
        BoardChange: attack.expectedChange.toFixed(4)
    },
    ...results.slice(0, 2).map(r => ({
        Action: r.name,
        BoardChange: r.expectedChange.toFixed(4)
    }))
]);

console.log('\nSWITCH TURN PREDICTION TEST: PASS');
