const assert = require('node:assert/strict');

const {
    selectEnemyBuilds
} = require('../src/enemy_build_selection');

const {
    aggregateBuildScores,
    evaluateMultiBuildAction
} = require('../src/multi_build_prediction');

const {
    evaluateAdaptiveAction
} = require('../src/adaptive_prediction');

const observed = {
    species: 'Starmie',
    moves: ['Surf', 'Ice Beam'],
    hp: {percent: 65}
};

const selection = selectEnemyBuilds(
    observed, 5
);

const own = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252, spe:252},
    curHP: 100
};

const snorlax = {
    species: 'Snorlax',
    level: 50,
    nature: 'Careful',
    ability: 'Thick Fat',
    evs: {hp:252, spd:252}
};

const metagross = {
    species: 'Metagross',
    level: 50,
    nature: 'Adamant',
    ability: 'Clear Body',
    evs: {hp:252, atk:252}
};

const common = {
    own,
    ownMove: 'Earthquake',
    ownMoves: ['Earthquake', 'Dragon Claw'],
    enemyMoves: ['Surf', 'Ice Beam'],
    riskWeight: 0.5,
    discount: 0.85
};

const actions = [
    {
        ...common
    },
    {
        ...common,
        candidate: snorlax,
        candidateMoves: ['Body Slam', 'Crunch']
    },
    {
        ...common,
        candidate: metagross,
        candidateMoves: [
            'Meteor Mash',
            'Thunder Punch'
        ]
    }
];

const results = [];

const started = performance.now();

for (const action of actions) {
    const result = evaluateMultiBuildAction({
        ...action,
        builds: selection.builds,
        buildRiskWeight: 0.25
    });

    assert.ok(Number.isFinite(result.score));
    assert.ok(result.score >= result.worst - 1e-9);
    assert.ok(result.score <= result.average + 1e-9);
    assert.ok(result.average <= result.best + 1e-9);
    assert.ok(result.deviation >= 0);

    results.push(result);

    console.log('\n=== ' + result.action + ' ===');

    console.table(result.results.map(r => ({
        Build: r.name,
        Weight: (r.probability * 100).toFixed(2) + '%',
        Score: r.score.toFixed(4)
    })));
}

console.log('\n=== MULTI-BUILD ACTION RANKING ===');

results.sort((a, b) => b.score - a.score);

console.table(results.map((r, i) => ({
    Rank: i + 1,
    Action: r.action,
    Average: r.average.toFixed(4),
    Worst: r.worst.toFixed(4),
    Best: r.best.toFixed(4),
    Deviation: r.deviation.toFixed(4),
    Score: r.score.toFixed(4),
    Evaluations: r.evaluations
})));

const sample = [
    {name:'A', probability:0.75, score:1},
    {name:'B', probability:0.25, score:-1}
];

assert.equal(
    aggregateBuildScores(sample, 0).score,
    0.5
);

assert.equal(
    aggregateBuildScores(sample, 1).score,
    -1
);

assert.equal(
    aggregateBuildScores(sample, 0.25).score,
    0.125
);

const single = evaluateMultiBuildAction({
    ...common,
    builds: [selection.builds[0]]
});

const direct = evaluateAdaptiveAction({
    ...common,
    enemy: selection.builds[0].config
});

assert.ok(
    Math.abs(single.score - direct.score) < 1e-9
);

console.log(
    '\nElapsed:',
    (performance.now() - started).toFixed(2),
    'ms'
);

console.log('\nMULTI-BUILD PREDICTION TEST: PASS');
