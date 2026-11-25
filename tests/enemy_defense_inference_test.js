const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    predictDamage
} = require('../src/damage');

const {
    displayHP
} = require('../src/hp_inference');

const {
    updateBuildsFromDealtDamage
} = require('../src/enemy_defense_inference');

const own = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252, spe:252}
};

const builds = estimateEnemyBuilds({
    species: 'Suicune',
    ability: 'Pressure',
    item: 'Leftovers',
    hp: {percent:100},
    moves: ['Surf', 'Ice Beam']
});

const actual = {
    species: 'Suicune',
    level: 50,
    nature: 'Bold',
    ability: 'Pressure',
    item: 'Leftovers',
    evs: {hp:252, def:252, spd:4}
};

const damage = predictDamage({
    attacker: own,
    defender: actual,
    move: 'Earthquake'
});

const actualDamage = damage.rolls[
    Math.floor(damage.rolls.length / 2)
];

const after = displayHP(
    damage.maxHP - actualDamage,
    damage.maxHP
);

console.log('\n=== ACTUAL OBSERVATION ===');

console.table({
    MaxHP: damage.maxHP,
    ActualDamage: actualDamage,
    Before: 100,
    After: after
});

const result = updateBuildsFromDealtDamage({
    builds,
    own,
    ownMove: 'Earthquake',
    before: 100,
    after
});

assert.equal(result.contradiction, false);

console.log('\n=== DEFENSIVE BUILD INFERENCE ===');

console.table(result.builds.map(b => ({
    Build: b.name,
    MaxHP: b.maxHP,
    Defense: b.stats.def,
    Damage: b.predictedMin + '-' + b.predictedMax,
    MatchRate: (b.matchRate * 100).toFixed(2) + '%',
    Before: (
        b.previousProbability * 100
    ).toFixed(2) + '%',
    After: (
        b.probability * 100
    ).toFixed(2) + '%'
})));

const wall = result.builds.find(
    b => b.name === 'Physical Wall'
);

assert.ok(wall);
assert.ok(wall.matchRate > 0);

assert.ok(
    wall.probability > wall.previousProbability
);

assert.ok(Math.abs(
    result.builds.reduce(
        (sum, b) => sum + b.probability,
        0
    ) - 1
) < 1e-9);

const invalid = updateBuildsFromDealtDamage({
    builds,
    own,
    ownMove: 'Earthquake',
    before: 100,
    after: 99
});

assert.equal(invalid.contradiction, true);
assert.deepEqual(invalid.builds, builds);

console.log('\nContradiction handling: PASS');

console.log('\nENEMY DEFENSE INFERENCE TEST: PASS');
