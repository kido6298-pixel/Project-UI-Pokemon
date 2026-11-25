const assert = require('node:assert/strict');
const { evaluateSwitch } = require('../src/switch_evaluation');

const enemy = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252}
};

const candidates = [
    {
        species: 'Garchomp',
        nature: 'Jolly',
        evs: {atk: 252, spe: 252},
        curHP: 100
    },
    {
        species: 'Snorlax',
        ability: 'Thick Fat',
        nature: 'Careful',
        evs: {hp: 252, spd: 252}
    },
    {
        species: 'Metagross',
        nature: 'Adamant',
        evs: {hp: 252, atk: 252}
    },
    {
        species: 'Suicune',
        nature: 'Calm',
        evs: {hp: 252, spd: 252}
    }
];

const results = candidates.map(candidate =>
    evaluateSwitch({
        candidate,
        enemy,
        enemyMoves: ['Surf', 'Ice Beam']
    })
);

results.sort((a, b) => b.safetyScore - a.safetyScore);

console.log('\n=== SWITCH EVALUATION ===');

console.table(results.map(r => ({
    Pokemon: r.species,
    WorstMove: r.worstThreat.move,
    MinDamage: r.worstThreat.minDamage,
    MaxDamage: r.worstThreat.maxDamage,
    Survival: (r.survivalChance * 100).toFixed(2) + '%',
    Safety: r.safetyScore.toFixed(4)
})));

const garchomp = results.find(r => r.species === 'Garchomp');
const snorlax = results.find(r => r.species === 'Snorlax');

assert.equal(garchomp.survivalChance, 0);
assert.equal(snorlax.survivalChance, 1);
assert.ok(snorlax.safetyScore > garchomp.safetyScore);

const unknown = evaluateSwitch({
    candidate: candidates[0],
    enemy,
    enemyMoves: []
});

assert.equal(unknown.safetyScore, null);

console.log('\nSWITCH EVALUATION TEST: PASS');
