const assert = require('node:assert/strict');
const { evaluateAction } = require('../src/action_prediction');

const own = {
    species: 'Garchomp',
    nature: 'Jolly',
    evs: {atk: 252, spe: 252},
    curHP: 100
};

const enemy = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252},
    curHP: 90
};

const common = {
    own,
    enemy,
    ownMove: 'Earthquake',
    ownMoves: ['Earthquake', 'Dragon Claw'],
    enemyMoves: ['Surf', 'Ice Beam']
};

const actions = [
    common,
    {
        ...common,
        candidate: {
            species: 'Snorlax',
            ability: 'Thick Fat',
            nature: 'Careful',
            evs: {hp: 252, spd: 252}
        },
        candidateMoves: ['Body Slam', 'Crunch']
    },
    {
        ...common,
        candidate: {
            species: 'Metagross',
            nature: 'Adamant',
            evs: {hp: 252, atk: 252}
        },
        candidateMoves: ['Meteor Mash', 'Thunder Punch']
    }
];

const results = actions.map(options =>
    evaluateAction(options)
);

console.log('\n=== MULTI-MOVE ACTION PREDICTION ===');

console.table(results.map(r => ({
    Action: r.action,
    Average: r.average.toFixed(4),
    Worst: r.worst.toFixed(4),
    Best: r.best.toFixed(4),
    WorstMove: r.worstMove,
    Score: r.score.toFixed(4)
})));

console.log('\n=== ENEMY MOVE DETAILS ===');

console.table(results.flatMap(r =>
    r.results.map(s => ({
        Action: r.action,
        EnemyMove: s.enemyMove,
        Turn1: s.firstChange.toFixed(4),
        Turn2: s.secondChange.toFixed(4),
        Total: s.totalChange.toFixed(4)
    }))
));

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

for (const result of results) {
    assert.equal(result.results.length, 2);

    assert.ok(result.worst <= result.average);
    assert.ok(result.average <= result.best);
    assert.ok(result.worst <= result.score);
    assert.ok(result.score <= result.average);

    near(
        result.score,
        (result.average + result.worst) / 2
    );
}

const averageOnly = evaluateAction({
    ...common,
    riskWeight: 0
});

near(averageOnly.score, averageOnly.average);

const worstOnly = evaluateAction({
    ...common,
    riskWeight: 1
});

near(worstOnly.score, worstOnly.worst);

assert.throws(() => evaluateAction({
    ...common,
    enemyMoves: []
}));

assert.ok(
    results[1].worst > results[0].worst
);

console.log('\n=== ACTION RANKING ===');

console.table(
    [...results]
        .sort((a, b) => b.score - a.score)
        .map((r, i) => ({
            Rank: i + 1,
            Action: r.action,
            Score: r.score.toFixed(4)
        }))
);

console.log('\nMULTI-MOVE ACTION PREDICTION TEST: PASS');
