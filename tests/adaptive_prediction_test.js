const assert = require('node:assert/strict');

const {
    evaluateAdaptiveAction
} = require('../src/adaptive_prediction');

const {
    evaluateAction
} = require('../src/action_prediction');

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

const results = actions.map(options => {
    const fixed = evaluateAction(options);
    const adaptive = evaluateAdaptiveAction(options);

    return {
        action: adaptive.action,
        fixed: fixed.score,
        adaptive: adaptive.score,
        evaluations: adaptive.evaluations,
        details: adaptive.results
    };
});

console.log('\n=== ADAPTIVE ACTION PREDICTION ===');

console.table(results.map(r => ({
    Action: r.action,
    Fixed: r.fixed.toFixed(4),
    Adaptive: r.adaptive.toFixed(4),
    Difference: (r.adaptive - r.fixed).toFixed(4),
    Evaluations: r.evaluations
})));

console.log('\n=== ADAPTIVE BRANCH DETAILS ===');

console.table(results.flatMap(r =>
    r.details.map(s => ({
        Action: r.action,
        FirstEnemyMove: s.enemyMove,
        Turn1: s.firstChange.toFixed(4),
        Turn2: s.secondChange.toFixed(4),
        Total: s.totalChange.toFixed(4),
        Followup: Object.keys(s.followups).join(', ')
    }))
));

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

for (const options of actions) {
    const single = {
        ...options,
        enemyMoves: ['Ice Beam']
    };

    near(
        evaluateAdaptiveAction(single).score,
        evaluateAction(single).score
    );

    const conservative = {
        ...options,
        riskWeight: 1
    };

    assert.ok(
        evaluateAdaptiveAction(conservative).score <=
        evaluateAction(conservative).score + 1e-9
    );
}

const locked = evaluateAdaptiveAction({
    ...actions[2],
    enemy: {
        ...enemy,
        item: 'Choice Specs'
    }
});

assert.ok(Number.isFinite(locked.score));

const ownLocked = evaluateAdaptiveAction({
    ...common,
    own: {
        ...own,
        item: 'Choice Band',
        curHP: 184
    },
    enemy: {
        species: 'Suicune',
        nature: 'Bold',
        evs: {hp: 252, def: 252}
    },
    enemyMoves: ['Surf']
});

assert.ok(
    ownLocked.results.some(
        r => Object.keys(r.followups).length > 0
    )
);

for (const result of ownLocked.results) {
    assert.ok(
        Object.keys(result.followups).every(
            move => move === 'Earthquake'
        )
    );
}

console.log('\n=== ACTION RANKING ===');

console.table(
    [...results]
        .sort((a, b) => b.adaptive - a.adaptive)
        .map((r, i) => ({
            Rank: i + 1,
            Action: r.action,
            Score: r.adaptive.toFixed(4)
        }))
);

console.log('\nADAPTIVE ACTION PREDICTION TEST: PASS');
