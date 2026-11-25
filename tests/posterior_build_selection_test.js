const assert = require('node:assert/strict');

const {
    estimateEnemyBuilds
} = require('../src/enemy_builds');

const {
    selectPosteriorBuilds
} = require('../src/posterior_build_selection');

const source = estimateEnemyBuilds({
    species: 'Suicune',
    ability: 'Pressure',
    item: 'Leftovers',
    hp: {percent: 100},
    moves: ['Surf', 'Ice Beam']
});

function makeBuilds(probabilities) {
    return probabilities.map((probability, i) => ({
        ...structuredClone(source[i]),
        probability
    }));
}

const cases = [
    {
        name: 'Early battle',
        probabilities: [0.30,0.25,0.20,0.15,0.07,0.03],
        expected: 5
    },
    {
        name: 'Middle battle',
        probabilities: [0.70,0.20,0.06,0.02,0.01,0.01],
        expected: 3
    },
    {
        name: 'Late battle',
        probabilities: [0.98,0.01,0.004,0.003,0.002,0.001],
        expected: 1
    }
];

const results = [];

for (const test of cases) {
    const builds = makeBuilds(test.probabilities);

    const original = structuredClone(builds);

    const result = selectPosteriorBuilds(builds);

    assert.equal(result.selectedCount, test.expected);

    assert.ok(Math.abs(
        result.builds.reduce(
            (sum, build) => sum + build.probability,
            0
        ) - 1
    ) < 1e-9);

    assert.deepEqual(builds, original);

    results.push({
        Scenario: test.name,
        Original: result.originalCount,
        Selected: result.selectedCount,
        Coverage: (result.coverage * 100).toFixed(2) + '%',
        Omitted: (
            result.omittedProbability * 100
        ).toFixed(2) + '%',
        TargetReached: result.targetReached
    });
}

console.log('\n=== ADAPTIVE BUILD SELECTION ===');

console.table(results);

const limited = selectPosteriorBuilds(
    makeBuilds([0.30,0.25,0.20,0.15,0.07,0.03]),
    {limit: 2}
);

assert.equal(limited.selectedCount, 2);
assert.equal(limited.targetReached, false);
assert.ok(Math.abs(limited.coverage - 0.55) < 1e-9);

const duplicate = structuredClone(source[0]);

const merged = selectPosteriorBuilds([
    {...duplicate, probability: 0.6},
    {...duplicate, probability: 0.4}
]);

assert.equal(merged.selectedCount, 1);
assert.equal(merged.mergedCount, 1);
assert.equal(merged.coverage, 1);

assert.throws(() => selectPosteriorBuilds([]));

assert.throws(() => selectPosteriorBuilds(
    makeBuilds([0,0,0])
));

assert.throws(() => selectPosteriorBuilds(
    makeBuilds([0.5,-0.1,0.6])
));

console.log('\nCandidate limit: PASS');
console.log('Duplicate merging: PASS');
console.log('Probability normalization: PASS');
console.log('Original data protection: PASS');
console.log('Invalid input handling: PASS');

console.log('\nPOSTERIOR BUILD SELECTION TEST: PASS');
