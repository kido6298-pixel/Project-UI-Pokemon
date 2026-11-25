const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const examples = [
    {
        species: 'Garchomp',
        moves: ['Earthquake', 'Dragon Claw'],
        hp: {percent:100}
    },
    {
        species: 'Starmie',
        moves: ['Surf', 'Ice Beam'],
        hp: {percent:60}
    },
    {
        species: 'Suicune',
        moves: ['Surf'],
        item: 'Leftovers',
        hp: {percent:75}
    },
    {
        species: 'Metagross',
        moves: ['Meteor Mash'],
        item: 'Choice Scarf',
        hp: {percent:50}
    }
];

for (const observed of examples) {
    const builds = estimateEnemyBuilds(observed);

    const sum = builds.reduce(
        (total, build) => total + build.probability,
        0
    );

    assert.ok(Math.abs(sum - 1) < 1e-9);

    for (const build of builds) {
        assert.ok(build.config.curHP <= build.maxHP);
        assert.ok(build.probability > 0);

        if (observed.item) {
            assert.equal(
                build.config.item,
                observed.item
            );
        }

        assert.ok(
            Object.values(build.config.evs)
                .reduce((a,b) => a+b,0) <= 510
        );
    }

    console.log('\n=== ' + observed.species + ' ===');

    console.table(builds.map(build => ({
        Build: build.name,
        Nature: build.config.nature,
        Item: build.config.item || 'Unknown',
        HP: build.config.curHP + '/' + build.maxHP,
        ATK: build.stats.atk,
        DEF: build.stats.def,
        SPA: build.stats.spa,
        SPD: build.stats.spd,
        SPE: build.stats.spe,
        Weight: (build.probability * 100).toFixed(2) + '%'
    })));
}

console.log('\nENEMY BUILD ESTIMATION TEST: PASS');
