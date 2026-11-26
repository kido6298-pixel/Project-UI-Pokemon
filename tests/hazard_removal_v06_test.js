const assert=require('node:assert/strict');

const {
    predictRapidSpinRemoval:spin,
    predictToxicSpikesAbsorption:absorb
}=require('../src/hazard_removal_v06');

const conditions={
    'Stealth Rock':1,
    'Spikes':3,
    'Toxic Spikes':2,
    'Reflect':1,
    'Light Screen':1
};

const success=spin({
    conditions,
    hit:true,
    damage:20
});

assert.equal(success.success,true);
assert.equal(success.removed.length,3);

assert.deepEqual(success.conditions,{
    'Reflect':1,
    'Light Screen':1
});

console.log('Rapid Spin removal: PASS');

const immune=spin({
    conditions,
    hit:true,
    damage:0
});

assert.equal(immune.success,false);
assert.deepEqual(immune.conditions,conditions);

console.log('Ghost immunity: PASS');

const miss=spin({
    conditions,
    hit:false,
    damage:0
});

assert.equal(miss.changed,false);

const fainted=spin({
    conditions,
    hit:true,
    damage:20,
    actorAlive:false
});

assert.equal(fainted.changed,false);

console.log('Failed action handling: PASS');

const prefixed=spin({
    conditions:{
        'move: Spikes':{layers:3},
        'move: Stealth Rock':1,
        'Reflect':1
    },
    hit:true,
    damage:10
});

assert.deepEqual(prefixed.conditions,{
    'Reflect':1
});

console.log('Condition normalization: PASS');

function pokemon(species,ability='',extra={}) {
    return {
        species,
        ability,
        level:50,
        nature:'Hardy',
        ...extra
    };
}

const grounded=absorb({
    candidate:pokemon(
        'Tentacruel','Clear Body'
    ),
    conditions
});

assert.equal(grounded.absorbed,true);

assert.deepEqual(grounded.conditions,{
    'Stealth Rock':1,
    'Spikes':3,
    'Reflect':1,
    'Light Screen':1
});

console.log('Grounded Poison absorption: PASS');

const levitate=absorb({
    candidate:pokemon(
        'Gengar','Levitate'
    ),
    conditions
});

assert.equal(levitate.absorbed,false);

const flying=absorb({
    candidate:pokemon(
        'Crobat','Inner Focus'
    ),
    conditions
});

assert.equal(flying.absorbed,false);

console.log('Airborne Poison Pokemon: PASS');

const gravity=absorb({
    candidate:pokemon(
        'Gengar','Levitate'
    ),
    conditions,
    field:{gravity:true}
});

assert.equal(gravity.absorbed,true);

const ironBall=absorb({
    candidate:pokemon(
        'Crobat','Inner Focus',
        {item:'Iron Ball'}
    ),
    conditions
});

assert.equal(ironBall.absorbed,true);

console.log('Forced grounding: PASS');

const steel=absorb({
    candidate:pokemon(
        'Metagross','Clear Body'
    ),
    conditions
});

assert.equal(steel.absorbed,false);

const normal=absorb({
    candidate:pokemon(
        'Suicune','Pressure'
    ),
    conditions
});

assert.equal(normal.absorbed,false);

console.log('Non-Poison exclusion: PASS');

const lowHP=absorb({
    candidate:pokemon(
        'Tentacruel','Clear Body',
        {curHP:1}
    ),
    conditions
});

assert.equal(lowHP.absorbed,false);

console.log('Entry KO handling: PASS');

assert.equal(conditions.Spikes,3);
assert.equal(conditions['Toxic Spikes'],2);

console.log('Input protection: PASS');

console.table([
    ['Rapid Spin',success],
    ['Ghost immunity',immune],
    ['Tentacruel',grounded],
    ['Gengar',levitate],
    ['Gengar + Gravity',gravity],
    ['Crobat + Iron Ball',ironBall]
].map(([scenario,r])=>({
    scenario,
    changed:r.changed,
    removed:r.removed.join(', ')
})));

console.log('HAZARD REMOVAL V06 TEST: PASS');