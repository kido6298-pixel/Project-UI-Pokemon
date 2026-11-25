const assert = require('node:assert/strict');
const { evaluateAttackTurn } = require('../src/attack_turn');

const own = {
    species: 'Garchomp',
    currentHP: 100,
    maxHP: 100
};

const enemy = {
    species: 'Starmie',
    currentHP: 100,
    maxHP: 100
};

const scenarios = [
    ['First KO', {
        ownRolls: [100],
        enemyRolls: [100],
        firstChance: 1
    }],
    ['Enemy first KO', {
        ownRolls: [100],
        enemyRolls: [100],
        firstChance: 0
    }],
    ['Speed tie', {
        ownRolls: [100],
        enemyRolls: [100],
        firstChance: 0.5
    }],
    ['Damage trade', {
        ownRolls: [60],
        enemyRolls: [30],
        firstChance: 1
    }],
    ['Accuracy risk', {
        ownRolls: [100],
        enemyRolls: [100],
        ownAccuracy: 0.8,
        firstChance: 1
    }],
    ['Damage rolls', {
        ownRolls: [90, 100],
        enemyRolls: [50],
        firstChance: 1
    }]
];

const results = scenarios.map(([name, options]) => ({
    name,
    ...evaluateAttackTurn({
        own,
        enemy,
        ...options
    })
}));

console.log('\n=== ATTACK TURN PREDICTION ===');

console.table(results.map(r => ({
    Scenario: r.name,
    OwnHP: r.expectedOwnHP.toFixed(2),
    EnemyHP: r.expectedEnemyHP.toFixed(2),
    OwnKO: (r.ownKOChance * 100).toFixed(2) + '%',
    EnemyKO: (r.enemyKOChance * 100).toFixed(2) + '%',
    BoardChange: r.expectedChange.toFixed(4),
    Probability: r.probabilitySum.toFixed(6)
})));

const get = name => results.find(r => r.name === name);

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

near(get('First KO').enemyKOChance, 1);
near(get('First KO').expectedOwnHP, 100);

near(get('Enemy first KO').ownKOChance, 1);
near(get('Enemy first KO').expectedEnemyHP, 100);

near(get('Speed tie').ownKOChance, 0.5);
near(get('Speed tie').enemyKOChance, 0.5);
near(get('Speed tie').expectedChange, 0);

near(get('Damage trade').expectedChange, 0.15);

near(get('Accuracy risk').ownKOChance, 0.2);
near(get('Accuracy risk').enemyKOChance, 0.8);

near(get('Damage rolls').enemyKOChance, 0.5);
near(get('Damage rolls').expectedOwnHP, 75);
near(get('Damage rolls').expectedEnemyHP, 5);

for (const result of results) {
    near(result.probabilitySum, 1);
}

console.log('\nATTACK TURN PREDICTION TEST: PASS');
