const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const unknown = estimateEnemyBuilds({
    species: 'Scizor',
    item: 'Life Orb',
    moves: ['Bullet Punch']
});

const abilities = {};

for (const build of unknown) {
    const ability = build.config.ability;

    abilities[ability] =
        (abilities[ability] || 0) + build.probability;
}

console.log('\n=== UNKNOWN ABILITY ===');
console.table(abilities);

assert.ok(Math.abs(abilities.Swarm - 0.5) < 1e-9);
assert.ok(Math.abs(abilities.Technician - 0.5) < 1e-9);

assert.equal(
    new Set(unknown.map(b => b.name)).size,
    unknown.length
);

const known = estimateEnemyBuilds({
    species: 'Scizor',
    ability: 'Technician',
    item: 'Life Orb',
    moves: ['Bullet Punch']
});

assert.ok(known.every(
    b => b.config.ability === 'Technician'
));

console.log('Unknown ability candidates:', unknown.length);
console.log('Known ability candidates:', known.length);

console.log('\nABILITY CANDIDATES TEST: PASS');
