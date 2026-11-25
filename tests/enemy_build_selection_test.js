const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    mergeBuilds,
    selectEnemyBuilds
} = require('../src/enemy_build_selection');

const examples = [
    {
        species: 'Garchomp',
        moves: ['Earthquake', 'Dragon Claw']
    },
    {
        species: 'Starmie',
        moves: ['Surf', 'Ice Beam']
    },
    {
        species: 'Suicune',
        moves: ['Surf'],
        item: 'Leftovers'
    },
    {
        species: 'Metagross',
        moves: ['Meteor Mash'],
        item: 'Choice Scarf'
    }
];

const summary = [];

for (const observed of examples) {
    const original = estimateEnemyBuilds(observed);
    const merged = mergeBuilds(original);

    assert.ok(Math.abs(
        merged.reduce(
            (sum, b) => sum + b.probability, 0
        ) - 1
    ) < 1e-9);

    const result = selectEnemyBuilds(observed, 5);

    assert.ok(result.selectedCount <= 5);
    assert.ok(result.coverage > 0);
    assert.ok(result.coverage <= 1 + 1e-9);

    assert.ok(Math.abs(
        result.builds.reduce(
            (sum, b) => sum + b.probability, 0
        ) - 1
    ) < 1e-9);

    if (observed.species === 'Metagross') {
        assert.equal(result.originalCount, 9);
        assert.equal(result.mergedCount, 7);
    }

    if (!observed.item) {
        assert.ok(result.builds.some(
            b => b.config.item === 'Choice Scarf'
        ));
    }

    console.log('\n=== ' + observed.species + ' ===');

    console.table(result.builds.map(build => ({
        Build: build.names.join(' + '),
        Item: build.config.item || 'Unknown',
        HP: build.maxHP,
        ATK: build.stats.atk,
        DEF: build.stats.def,
        SPA: build.stats.spa,
        SPD: build.stats.spd,
        SPE: build.stats.spe,
        Original: (
            build.originalProbability * 100
        ).toFixed(2) + '%',
        SearchWeight: (
            build.probability * 100
        ).toFixed(2) + '%'
    })));

    summary.push({
        Species: observed.species,
        Original: result.originalCount,
        Merged: result.mergedCount,
        Selected: result.selectedCount,
        Coverage: (
            result.coverage * 100
        ).toFixed(2) + '%'
    });
}

console.log('\n=== BUILD SELECTION SUMMARY ===');
console.table(summary);

console.log('\nENEMY BUILD SELECTION TEST: PASS');
