const assert = require('node:assert/strict');
const { predictThreat } = require('../src/threat');

const own = {
    species: 'Garchomp',
    nature: 'Jolly',
    evs: {hp: 4, atk: 252, spe: 252},
    curHP: 100
};

const enemy = {
    species: 'Starmie',
    nature: 'Timid',
    evs: {spa: 252, spe: 252}
};

function test(name, options) {
    const result = predictThreat({
        own,
        enemy,
        enemyMoves: ['Surf', 'Ice Beam'],
        ownMove: 'Earthquake',
        ...options
    });

    console.log('\n=== ' + name + ' ===');
    console.table(result.threats);

    return result;
}

const normal = test('Normal battle', {});

assert.equal(normal.worstThreat.move, 'Ice Beam');
assert.equal(normal.worstThreat.enemyFirstChance, 1);
assert.equal(normal.worstThreat.beforeActionKO, 1);
assert.equal(normal.worstThreat.actionChance, 0);

const scarf = test('Choice Scarf', {
    own: {...own, item: 'Choice Scarf'}
});

assert.equal(scarf.worstThreat.enemyFirstChance, 0);
assert.equal(scarf.worstThreat.actionChance, 1);

const room = test('Trick Room', {
    trickRoom: true
});

assert.equal(room.worstThreat.enemyFirstChance, 0);

const priority = test('Priority move', {
    ownMove: 'Quick Attack'
});

assert.equal(priority.worstThreat.enemyFirstChance, 0);

console.log('\nTHREAT PREDICTION TEST: PASS');
