const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    refreshPosteriorBuilds
} = require('../src/posterior_build_state');

const {
    displayHP
} = require('../src/hp_inference');

const source = estimateEnemyBuilds({
    species: 'Suicune',
    ability: 'Pressure',
    item: 'Leftovers',
    hp: {percent: 100},
    moves: ['Surf', 'Ice Beam']
});

const original = structuredClone(source);

const observed = {
    species: 'Suicune',
    hp: {percent: 63},
    status: 'par',
    boosts: {
        spa: 2,
        spd: 1,
        spe: -1
    },
    item: 'Leftovers',
    ability: 'Pressure'
};

const updated = refreshPosteriorBuilds(
    source,
    observed
);

assert.equal(updated.length, source.length);

for (let i = 0; i < updated.length; i++) {
    const build = updated[i];

    assert.equal(
        build.probability,
        source[i].probability
    );

    assert.equal(
        displayHP(
            build.config.curHP,
            build.maxHP
        ),
        63
    );

    assert.equal(build.config.status, 'par');
    assert.equal(build.config.boosts.spa, 2);
    assert.equal(build.config.boosts.spd, 1);
    assert.equal(build.config.boosts.spe, -1);
    assert.equal(build.config.item, 'Leftovers');
    assert.equal(build.config.ability, 'Pressure');

    assert.deepEqual(build.stats, source[i].stats);
}

assert.deepEqual(source, original);

console.log('\n=== REFRESHED BUILD STATE ===');

console.table(updated.map(build => ({
    Build: build.name,
    MaxHP: build.maxHP,
    CurrentHP: build.config.curHP,
    HPRange:
        build.hpRange.min + '-' +
        build.hpRange.max,
    Status: build.config.status,
    SpA: build.config.boosts.spa,
    SpD: build.config.boosts.spd,
    Spe: build.config.boosts.spe,
    Probability:
        (build.probability * 100).toFixed(2) + '%'
})));

const reset = refreshPosteriorBuilds(
    updated,
    {
        ...observed,
        hp: {percent: 100},
        status: null,
        boosts: {}
    }
);

for (const build of reset) {
    assert.equal(build.config.curHP, build.maxHP);
    assert.equal(build.config.status, '');
    assert.deepEqual(build.config.boosts, {});
}

console.log('\n=== HP DISPLAY CONSISTENCY ===');

let checks = 0;

for (let percent = 1; percent <= 100; percent++) {
    const builds = refreshPosteriorBuilds(
        source,
        {
            ...observed,
            hp: {percent}
        }
    );

    for (const build of builds) {
        assert.equal(
            displayHP(
                build.config.curHP,
                build.maxHP
            ),
            percent
        );

        checks++;
    }
}

console.log('HP checks:', checks);

assert.throws(() => refreshPosteriorBuilds(
    source,
    {...observed, hp: {percent: 101}}
));

console.log('Probability preservation: PASS');
console.log('Stat preservation: PASS');
console.log('Status synchronization: PASS');
console.log('Boost synchronization: PASS');
console.log('Original data protection: PASS');
console.log('State reset: PASS');

console.log('\nPOSTERIOR BUILD STATE TEST: PASS');
