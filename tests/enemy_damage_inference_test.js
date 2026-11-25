const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    mergeBuilds
} = require('../src/enemy_build_selection');

const {
    updateBuildsFromDamage
} = require('../src/enemy_damage_inference');

const {
    updateBuildsFromOrder
} = require('../src/enemy_order_inference');

const {
    predictDamage
} = require('../src/damage');

const own = {
    species: 'Snorlax',
    level: 50,
    nature: 'Careful',
    ability: 'Thick Fat',
    evs: {hp:252, spd:252}
};

const builds = mergeBuilds(
    estimateEnemyBuilds({
        species: 'Starmie',
        moves: ['Surf', 'Ice Beam'],
        item: 'Leftovers'
    })
);

function probabilityOf(list, name) {
    return list.find(
        b => b.name === name
    ).probability;
}

function show(name, result) {
    console.log('\n=== ' + name + ' ===');
    console.log('Observed damage:', result.observedDamage);

    console.table(result.builds.map(b => ({
        Build: b.name,
        Damage: b.predictedMin + '-' + b.predictedMax,
        Matches: b.matches,
        Before: (
            b.previousProbability * 100
        ).toFixed(2) + '%',
        After: (
            b.probability * 100
        ).toFixed(2) + '%'
    })));

    assert.ok(Math.abs(
        result.builds.reduce(
            (sum, b) => sum + b.probability, 0
        ) - 1
    ) < 1e-9);
}

const power = builds.find(
    b => b.name === 'Power Special'
);

const fast = builds.find(
    b => b.name === 'Fast Special'
);

const powerDamage = predictDamage({
    attacker: power.config,
    defender: own,
    move: 'Surf'
});

const fastDamage = predictDamage({
    attacker: fast.config,
    defender: own,
    move: 'Surf'
});

const high = updateBuildsFromDamage({
    builds,
    own,
    enemyMove: 'Surf',
    observedDamage: powerDamage.max
});

show('HIGH DAMAGE', high);

assert.equal(high.contradiction, false);

assert.ok(
    probabilityOf(high.builds, 'Power Special') >
    probabilityOf(builds, 'Power Special')
);

const low = updateBuildsFromDamage({
    builds,
    own,
    enemyMove: 'Surf',
    observedDamage: fastDamage.min
});

show('LOWER DAMAGE', low);

assert.equal(low.contradiction, false);

assert.ok(
    probabilityOf(low.builds, 'Fast Special') >
    probabilityOf(builds, 'Fast Special')
);

const contradiction = updateBuildsFromDamage({
    builds,
    own,
    enemyMove: 'Surf',
    observedDamage: 999
});

assert.equal(contradiction.contradiction, true);

for (const build of contradiction.builds) {
    assert.ok(Math.abs(
        build.probability -
        build.previousProbability
    ) < 1e-9);
}

console.log('\nContradiction handling: PASS');

const garchomp = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252, spe:252}
};

const order = updateBuildsFromOrder({
    builds,
    own: garchomp,
    ownFirst: true
});

const combined = updateBuildsFromDamage({
    builds: order.builds,
    own,
    enemyMove: 'Surf',
    observedDamage: powerDamage.max
});

show('ORDER + DAMAGE EVIDENCE', combined);

assert.equal(
    combined.builds[0].name,
    'Power Special'
);

console.log('\nENEMY DAMAGE INFERENCE TEST: PASS');
