const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    mergeBuilds
} = require('../src/enemy_build_selection');

const {
    updateBuildsFromOrder
} = require('../src/enemy_order_inference');

const own = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252, spe:252}
};

const builds = mergeBuilds(
    estimateEnemyBuilds({
        species: 'Starmie',
        moves: ['Surf', 'Ice Beam']
    })
);

function probabilityOf(list, predicate) {
    return list.filter(predicate).reduce(
        (sum, b) => sum + b.probability, 0
    );
}

function test(name, options) {
    const result = updateBuildsFromOrder({
        builds,
        own,
        ...options
    });

    assert.equal(result.contradiction, false);

    assert.ok(Math.abs(
        result.builds.reduce(
            (sum, b) => sum + b.probability, 0
        ) - 1
    ) < 1e-9);

    console.log('\n=== ' + name + ' ===');

    console.table(result.builds.map(b => ({
        Build: b.name,
        OwnSpeed: b.ownSpeed,
        EnemySpeed: b.enemySpeed,
        Before: (
            b.previousProbability * 100
        ).toFixed(2) + '%',
        After: (
            b.probability * 100
        ).toFixed(2) + '%',
        Likelihood: b.likelihood.toFixed(4)
    })));

    return result.builds;
}

const slower = test(
    'GARCHOMP MOVES FIRST',
    {ownFirst: true}
);

assert.ok(
    probabilityOf(
        slower,
        b => b.enemySpeed < b.ownSpeed
    ) > 0.9
);

const faster = test(
    'STARMIE MOVES FIRST',
    {ownFirst: false}
);

assert.ok(
    probabilityOf(
        faster,
        b => b.enemySpeed > b.ownSpeed
    ) > 0.9
);

const priority = test(
    'GARCHOMP HAS PRIORITY',
    {ownFirst: true, ownPriority: 1}
);

for (const build of priority) {
    assert.ok(Math.abs(
        build.probability -
        build.previousProbability
    ) < 1e-9);
}

const reversed = test(
    'TRICK ROOM',
    {ownFirst: true, trickRoom: true}
);

assert.ok(
    probabilityOf(
        reversed,
        b => b.enemySpeed > b.ownSpeed
    ) > 0.9
);

const second = updateBuildsFromOrder({
    builds: faster,
    own,
    ownFirst: false
});

assert.ok(
    probabilityOf(
        second.builds,
        b => b.enemySpeed > b.ownSpeed
    ) >
    probabilityOf(
        faster,
        b => b.enemySpeed > b.ownSpeed
    )
);

console.log('\nRepeated evidence update: PASS');

console.log('\nENEMY ORDER INFERENCE TEST: PASS');
