const assert = require('node:assert/strict');

const {
    getHPDependencies
} = require('../src/hp_dependencies');

const cases = [
    ['Earthquake','Sand Veil',false,false],
    ['Dragon Claw','Sand Veil',false,false],
    ['Ice Beam','Pressure',false,false],
    ['Surf','Pressure',false,false],
    ['Bullet Punch','Technician',false,false],
    ['Flamethrower','Blaze',true,false],
    ['Surf','Torrent',true,false],
    ['Seed Bomb','Overgrow',true,false],
    ['X-Scissor','Swarm',true,false],
    ['Earthquake','',true,false],
    ['Eruption','Flash Fire',true,true],
    ['Water Spout','Pressure',true,true],
    ['Flail','Swift Swim',true,true],
    ['Reversal','Guts',true,true],
    ['Brine','Pressure',true,true],
    ['Crush Grip','Slow Start',true,true],
    ['Wring Out','Pressure',true,true],
    ['Pain Split','Levitate',true,true],
    ['Endeavor','Scrappy',true,true],
    ['Super Fang','Run Away',true,true],
    ['Recover','Natural Cure',true,true],
    ['Fury Attack','Skill Link',true,true],
    ['Invalid Move','Pressure',true,true]
];

const results = [];

for (const [
    move,
    ability,
    expectedAttacker,
    expectedDefender
] of cases) {
    const result = getHPDependencies({
        attacker: {ability},
        defender: {},
        move
    });

    assert.equal(
        result.attackerDependent,
        expectedAttacker,
        move + ': attacker'
    );

    assert.equal(
        result.defenderDependent,
        expectedDefender,
        move + ': defender'
    );

    results.push({
        Move: move,
        Ability: ability || 'Unknown',
        AttackerHP: result.attackerDependent,
        DefenderHP: result.defenderDependent,
        Supported: result.supported
    });
}

const custom = getHPDependencies({
    attacker: {ability:'Sand Veil'},
    defender: {},
    move: 'Earthquake',
    moveOptions: {isCrit:true}
});

assert.equal(custom.attackerDependent, true);
assert.equal(custom.defenderDependent, true);

console.log('\n=== HP DEPENDENCY CLASSIFICATION ===');
console.table(results);

console.log('Classification checks:', cases.length);
console.log('Custom move options protection: PASS');
console.log('\nHP DEPENDENCY TEST: PASS');
