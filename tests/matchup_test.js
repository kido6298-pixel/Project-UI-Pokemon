const assert = require('node:assert/strict');
const { evaluateMatchup } = require('../src/matchup');

const enemy = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252}
};

const candidates = [
    {
        own: {
            species: 'Garchomp',
            nature: 'Jolly',
            evs: {atk: 252, spe: 252},
            curHP: 100
        },
        ownMoves: ['Earthquake', 'Dragon Claw']
    },
    {
        own: {
            species: 'Snorlax',
            ability: 'Thick Fat',
            nature: 'Careful',
            evs: {hp: 252, spd: 252}
        },
        ownMoves: ['Body Slam', 'Crunch']
    },
    {
        own: {
            species: 'Metagross',
            nature: 'Adamant',
            evs: {hp: 252, atk: 252}
        },
        ownMoves: ['Meteor Mash', 'Thunder Punch']
    },
    {
        own: {
            species: 'Suicune',
            nature: 'Calm',
            evs: {hp: 252, spd: 252}
        },
        ownMoves: ['Surf', 'Ice Beam']
    }
];

const results = candidates.map(candidate =>
    evaluateMatchup({
        ...candidate,
        enemy,
        enemyMoves: ['Surf', 'Ice Beam']
    })
);

results.sort((a, b) => b.score - a.score);

console.log('\n=== MATCHUP EVALUATION ===');

console.table(results.map(r => ({
    Pokemon: r.species,
    BestMove: r.bestMove.move,
    MinDamage: r.bestMove.minDamage,
    MaxDamage: r.bestMove.maxDamage,
    KO: (r.bestMove.koChance * 100).toFixed(2) + '%',
    First: (r.bestMove.firstChance * 100).toFixed(2) + '%',
    Risk: (r.bestMove.beforeActionKO * 100).toFixed(2) + '%',
    Score: r.score.toFixed(4)
})));

const get = name => results.find(r => r.species === name);

assert.equal(get('Garchomp').score, 0);
assert.ok(get('Snorlax').score > get('Garchomp').score);
assert.ok(get('Snorlax').score > get('Suicune').score);
assert.equal(get('Snorlax').bestMove.move, 'Crunch');

const unknown = evaluateMatchup({
    ...candidates[0],
    enemy,
    enemyMoves: []
});

assert.equal(unknown.bestMove.threatKnown, false);
assert.equal(unknown.bestMove.beforeActionKO, null);

const scarf = evaluateMatchup({
    ...candidates[0],
    own: {
        ...candidates[0].own,
        item: 'Choice Scarf'
    },
    enemy,
    enemyMoves: ['Surf', 'Ice Beam']
});

assert.equal(scarf.bestMove.firstChance, 1);
assert.ok(scarf.score > get('Garchomp').score);

console.log('\nMATCHUP EVALUATION TEST: PASS');
