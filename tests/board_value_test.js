const assert = require('node:assert/strict');

const {
    evaluatePokemon,
    evaluateBoard
} = require('../src/board_value');

const healthy = [
    {species: 'Garchomp', hpRatio: 1},
    {species: 'Metagross', hpRatio: 1},
    {species: 'Snorlax', hpRatio: 1}
];

const damaged = healthy.map(p => ({
    ...p,
    hpRatio: 0.5
}));

const fainted = healthy.map((p, i) => ({
    ...p,
    hpRatio: i === 0 ? 0 : 1,
    fainted: i === 0
}));

const poisoned = healthy.map(p => ({
    ...p,
    status: 'tox'
}));

const scenarios = [
    ['Equal', healthy, healthy],
    ['HP advantage', healthy, damaged],
    ['Number advantage', healthy, fainted],
    ['Status advantage', healthy, poisoned],
    ['Disadvantage', damaged, healthy]
];

console.log('\n=== BOARD VALUE EVALUATION ===');

const results = scenarios.map(([name, own, enemy]) => {
    const result = evaluateBoard({own, enemy});

    return {
        Scenario: name,
        Own: result.own.value,
        Enemy: result.enemy.value,
        Advantage: result.advantage
    };
});

console.table(results.map(r => ({
    Scenario: r.Scenario,
    Own: r.Own.toFixed(3),
    Enemy: r.Enemy.toFixed(3),
    Advantage: r.Advantage.toFixed(3)
})));

assert.equal(results[0].Advantage, 0);
assert.ok(results[1].Advantage > 0);
assert.ok(results[2].Advantage > results[1].Advantage);
assert.ok(results[3].Advantage > 0);
assert.ok(results[4].Advantage < 0);

assert.equal(
    evaluatePokemon({hpRatio: 0, fainted: true}),
    0
);

console.log('\nBOARD VALUE TEST: PASS');
