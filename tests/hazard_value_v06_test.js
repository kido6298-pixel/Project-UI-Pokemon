const assert=require('node:assert/strict');

const {
    evaluateHazardPressure:predict,
    evaluateHazardAdvantage
}=require('../src/hazard_value_v06');

function pokemon(species,ability='',extra={}) {
    return {
        species,
        ability,
        level:50,
        nature:'Hardy',
        ...extra
    };
}

const gyarados=pokemon(
    'Gyarados','Intimidate'
);

const garchomp=pokemon(
    'Garchomp','Sand Veil'
);

const suicune=pokemon(
    'Suicune','Pressure'
);

const gengar=pokemon(
    'Gengar','Levitate'
);

const clefable=pokemon(
    'Clefable','Magic Guard'
);

function run(reserves,conditions) {
    return predict({reserves,conditions});
}

const neutral=run([suicune],{});

assert.equal(neutral.value,0);

console.log('Empty field: PASS');

const rock={
    'Stealth Rock':1
};

const gyaraRock=run([gyarados],rock);
const suicuneRock=run([suicune],rock);
const chompRock=run([garchomp],rock);

assert.ok(
    gyaraRock.value>suicuneRock.value
);

assert.ok(
    suicuneRock.value>chompRock.value
);

console.log('Type-dependent Stealth Rock: PASS');

const spikes=[1,2,3].map(layers=>
    run([suicune],{Spikes:layers})
);

assert.ok(spikes[1].value>spikes[0].value);
assert.ok(spikes[2].value>spikes[1].value);

assert.equal(
    run([gyarados],{Spikes:3}).value,0
);

assert.equal(
    run([gengar],{Spikes:3}).value,0
);

console.log('Spikes layers and immunity: PASS');

const toxic1=run(
    [suicune],{'Toxic Spikes':1}
);

const toxic2=run(
    [suicune],{'Toxic Spikes':2}
);

assert.ok(toxic2.value>toxic1.value);

assert.equal(
    run([gengar],{'Toxic Spikes':2}).value,0
);

assert.equal(
    run([
        pokemon('Metagross','Clear Body')
    ],{'Toxic Spikes':2}).value,0
);

console.log('Toxic Spikes pressure: PASS');

assert.equal(
    run([clefable],{
        'Stealth Rock':1,
        Spikes:3
    }).value,0
);

console.log('Magic Guard: PASS');

const excluded=run([
    {...suicune,active:true},
    {...gyarados,fainted:true},
    {...garchomp,curHP:0}
],rock);

assert.equal(excluded.members.length,0);
assert.equal(excluded.value,0);

console.log('Active and fainted exclusion: PASS');

const one=run([suicune],rock);

const two=run([
    suicune,gyarados
],rock);

assert.ok(two.value>one.value);

console.log('Reserve-dependent value: PASS');

const lowHP=run([
    {...gyarados,curHP:1}
],rock);

assert.equal(
    lowHP.members[0].faintedOnEntry,true
);

assert.ok(lowHP.value<gyaraRock.value);

console.log('Remaining HP damage cap: PASS');

const advantage=evaluateHazardAdvantage({
    ownReserves:[suicune],
    enemyReserves:[suicune],
    ownConditions:rock,
    enemyConditions:rock
});

assert.equal(advantage.advantage,0);

const positive=evaluateHazardAdvantage({
    ownReserves:[suicune],
    enemyReserves:[gyarados],
    enemyConditions:rock
});

assert.ok(positive.advantage>0);

console.log('Board advantage symmetry: PASS');

console.log('\n=== HAZARD VALUE RESULTS ===');

console.table([
    ['Gyarados + SR',gyaraRock],
    ['Suicune + SR',suicuneRock],
    ['Garchomp + SR',chompRock],
    ['Spikes 1',spikes[0]],
    ['Spikes 2',spikes[1]],
    ['Spikes 3',spikes[2]],
    ['Toxic Spikes 1',toxic1],
    ['Toxic Spikes 2',toxic2]
].map(([scenario,result])=>({
    scenario,
    value:Number(result.value.toFixed(6))
})));

console.log('HAZARD VALUE V06 TEST: PASS');