const assert=require('node:assert/strict');
const {Dex}=require('pokemon-showdown');

const {
    SUPPORTED_MOVES,
    predictStatusInfliction
}=require('../src/status_infliction');

const dex=Dex.mod('gen4');

const base={
    species:'Suicune',
    currentHP:160,
    maxHP:200,
    status:null,
    ability:'Pressure'
};

function predict(moveName,target={},extra={}) {
    return predictStatusInfliction({
        moveName,
        target:{...base,...target},
        ...extra
    });
}

const table=[];

for (const [move,status] of
    Object.entries(SUPPORTED_MOVES)) {

    const result=predict(move);
    const data=dex.moves.get(move);

    const accuracy=data.accuracy===true
        ? 1 : data.accuracy/100;

    assert.equal(result.supported,true);
    assert.equal(result.status,status);
    assert.equal(
        result.successProbability,
        accuracy
    );

    const success=result.outcomes.find(
        o=>o.success
    );

    assert.equal(success.target.status,status);

    assert.ok(Math.abs(
        result.outcomes.reduce(
            (sum,o)=>sum+o.probability,0
        )-1
    )<1e-12);

    table.push({
        move:data.name,
        status,
        accuracy:accuracy*100
    });
}

console.log('Move accuracy and status: PASS');

for (const [move,species] of [
    ['Will-O-Wisp','Heatran'],
    ['Toxic','Metagross'],
    ['Toxic','Gengar'],
    ['Thunder Wave','Garchomp']
]) {
    assert.equal(
        predict(move,{species})
            .successProbability,
        0
    );
}

console.log('Type immunities: PASS');

for (const [move,ability] of [
    ['Will-O-Wisp','Water Veil'],
    ['Will-O-Wisp','Flash Fire'],
    ['Toxic','Immunity'],
    ['Thunder Wave','Limber'],
    ['Thunder Wave','Volt Absorb'],
    ['Thunder Wave','Motor Drive'],
    ['Spore','Insomnia'],
    ['Spore','Vital Spirit']
]) {
    assert.equal(
        predict(move,{ability})
            .successProbability,
        0
    );
}

console.log('Ability immunities: PASS');

assert.equal(
    predict('Spore',{
        ability:'Insomnia'
    },{
        attacker:{ability:'Mold Breaker'}
    }).successProbability,
    1
);

console.log('Mold Breaker: PASS');

assert.equal(
    predict('Thunder Wave',{
        species:'Jolteon',
        ability:'Quick Feet'
    }).successProbability,
    1
);

assert.equal(
    predict('Stun Spore',{
        species:'Garchomp'
    }).successProbability,
    0.75
);

assert.equal(
    predict('Spore',{
        species:'Breloom'
    }).successProbability,
    1
);

console.log('Generation IV type rules: PASS');

for (const condition of [
    'protect','substitute','safeguard'
]) {
    assert.equal(
        predict('Spore',{},{
            conditions:{[condition]:true}
        }).successProbability,
        0
    );
}

assert.equal(
    predict('Toxic',{status:'par'})
        .successProbability,
    0
);

assert.equal(
    predict('Spore',{currentHP:0})
        .successProbability,
    0
);

console.log('Status and field protection: PASS');

const toxic=predict('Toxic')
    .outcomes.find(o=>o.success);

assert.equal(toxic.target.toxicCounter,0);

const sleep=predict('Spore')
    .outcomes.find(o=>o.success);

assert.equal(sleep.target.sleepState.elapsed,0);
assert.equal(
    sleep.target.sleepState.candidates.length,
    4
);

console.log('Status counter initialization: PASS');

assert.equal(
    predict('Spore',{
        ability:'Leaf Guard'
    },{
        conditions:{weather:'sun'}
    }).successProbability,
    0
);

assert.equal(
    predict('Spore',{},{
        conditions:{uproar:true}
    }).successProbability,
    0
);

console.log('Weather and Uproar: PASS');

assert.equal(
    predict('Surf').supported,
    false
);

assert.equal(base.status,null);

console.log('Unsupported move and input protection: PASS');

console.log('\n=== STATUS MOVES ===');
console.table(table);

console.log('STATUS INFLICTION TEST: PASS');