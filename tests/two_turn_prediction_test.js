const assert = require('node:assert/strict');
const { evaluateTwoTurns } = require('../src/two_turn_prediction');

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

const snorlax = {
    species: 'Snorlax',
    ability: 'Thick Fat',
    nature: 'Careful',
    evs: {hp: 252, spd: 252}
};

const metagross = {
    species: 'Metagross',
    nature: 'Adamant',
    evs: {hp: 252, atk: 252}
};

const common = {
    own,
    enemy,
    ownMove: 'Earthquake',
    ownMoves: ['Earthquake', 'Dragon Claw'],
    enemyMove: 'Ice Beam'
};

const results = [
    evaluateTwoTurns(common),

    evaluateTwoTurns({
        ...common,
        candidate: snorlax,
        candidateMoves: ['Body Slam', 'Crunch']
    }),

    evaluateTwoTurns({
        ...common,
        candidate: metagross,
        candidateMoves: ['Meteor Mash', 'Thunder Punch']
    }),

    evaluateTwoTurns({
        ...common,
        own: {...own, item: 'Choice Scarf'},
        ownMoves: ['Earthquake']
    })
];

console.log('\n=== TWO TURN PREDICTION ===');

console.table(results.map(r => ({
    Action: r.action,
    Turn1: r.firstChange.toFixed(4),
    Turn2: r.secondChange.toFixed(4),
    Total: r.totalChange.toFixed(4),
    Terminal: (r.terminalProbability * 100).toFixed(2) + '%',
    Branches: r.evaluatedBranches,
    Followup: Object.keys(r.followupMoves).join(', ')
})));

const [attack, snorlaxSwitch, metagrossSwitch, scarf] = results;

const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);

near(attack.terminalProbability, 1);
near(attack.secondChange, 0);

assert.ok(snorlaxSwitch.evaluatedBranches > 0);
assert.ok(metagrossSwitch.evaluatedBranches > 0);

assert.ok(snorlaxSwitch.totalChange > attack.totalChange);
assert.ok(metagrossSwitch.totalChange > attack.totalChange);

assert.ok(metagrossSwitch.secondChange > 0);

near(scarf.terminalProbability, 1);
near(scarf.secondChange, 0);

for (const result of results) {
    assert.ok(Number.isFinite(result.totalChange));
}

console.log('\nTWO TURN PREDICTION TEST: PASS');
