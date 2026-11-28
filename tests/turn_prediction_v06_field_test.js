const assert=require('node:assert/strict');

const {
    predictFieldTurnV06:predict
}=require('../src/turn_prediction_v06_field');

const {
    predictFullTurnV06:previous
}=require('../src/turn_prediction_v06_full');

const own={
    species:'Suicune',
    level:50,
    ability:'Pressure',
    nature:'Hardy',
    curHP:100
};

const enemy={
    species:'Starmie',
    level:50,
    ability:'Natural Cure',
    nature:'Hardy',
    curHP:100
};

const base={
    own,
    enemy,
    ownMove:'Surf',
    enemyMove:'Surf',
    residual:false,
    orderCalculator:()=>({firstChance:1}),
    damageCalculator:()=>({rolls:[40]})
};

function close(a,b) {
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
}

function run(changes={}) {
    const result=predict({...base,...changes});
    close(result.probabilitySum,1);
    return result;
}

const neutral=run();
const old=previous(base);

for (const key of [
    'expectedOwnHP',
    'expectedEnemyHP',
    'expectedValue',
    'expectedChange',
    'ownKOChance',
    'enemyKOChance'
]) {
    close(neutral[key],old[key]);
}

console.log('Previous predictor compatibility: PASS');

const rock=run({
    ownMove:'Stealth Rock'
});

assert.equal(
    rock.outcomes[0].enemyConditions['Stealth Rock'],
    1
);

assert.deepEqual(
    rock.outcomes[0].ownConditions,{}
);

close(rock.expectedOwnHP,60);
close(rock.expectedEnemyHP,100);

console.log('Stealth Rock integration: PASS');

const double=run({
    ownMove:'Stealth Rock',
    enemyMove:'Spikes'
});

assert.equal(
    double.outcomes[0].ownConditions.Spikes,1
);

assert.equal(
    double.outcomes[0].enemyConditions['Stealth Rock'],
    1
);

console.log('Both side conditions: PASS');

const second=run({
    ownMove:'Spikes',
    enemyMove:'Stealth Rock',
    orderCalculator:()=>({firstChance:0})
});

assert.equal(
    second.outcomes[0].enemyConditions.Spikes,1
);

assert.equal(
    second.outcomes[0].ownConditions['Stealth Rock'],
    1
);

console.log('Reverse action order: PASS');

const layers=run({
    ownMove:'Spikes',
    enemyConditions:{Spikes:2}
});

assert.equal(
    layers.outcomes[0].enemyConditions.Spikes,3
);

const capped=run({
    ownMove:'Spikes',
    enemyConditions:{Spikes:3}
});

assert.equal(
    capped.outcomes[0].enemyConditions.Spikes,3
);

const toxic=run({
    ownMove:'Toxic Spikes',
    enemyConditions:{'Toxic Spikes':1}
});

assert.equal(
    toxic.outcomes[0].enemyConditions['Toxic Spikes'],
    2
);

console.log('Hazard layer limits: PASS');

const continuation=run({
    own:double.outcomes[0].ownConfig,
    enemy:double.outcomes[0].enemyConfig,
    ownConditions:double.outcomes[0].ownConditions,
    enemyConditions:double.outcomes[0].enemyConditions,
    ownMove:'Spikes',
    enemyMove:'Spikes'
});

assert.equal(
    continuation.outcomes[0].ownConditions.Spikes,2
);

assert.equal(
    continuation.outcomes[0].enemyConditions.Spikes,1
);

assert.equal(
    continuation.outcomes[0]
        .enemyConditions['Stealth Rock'],1
);

console.log('Side condition continuation: PASS');

const boosted={
    ...enemy,
    boosts:{spa:3,spd:3}
};

const haze=run({
    enemy:boosted,
    ownMove:'Haze',
    damageCalculator:({attacker})=>({
        rolls:[attacker.boosts?.spa>0 ? 80 : 40]
    })
});

close(haze.expectedOwnHP,60);

assert.equal(
    haze.outcomes[0].enemyBoosts.spa,0
);

assert.equal(
    haze.outcomes[0].enemyBoosts.spd,0
);

const lateHaze=run({
    enemy:boosted,
    ownMove:'Haze',
    orderCalculator:()=>({firstChance:0}),
    damageCalculator:({attacker})=>({
        rolls:[attacker.boosts?.spa>0 ? 80 : 40]
    })
});

close(lateHaze.expectedOwnHP,20);

console.log('Haze and damage recalculation: PASS');

const hazeTie=run({
    ownMove:'Haze',
    enemyMove:'Calm Mind',
    orderCalculator:()=>({firstChance:0.5})
});

assert.equal(hazeTie.outcomes.length,2);

close(
    hazeTie.outcomes.find(
        o=>o.enemyBoosts.spa===1
    ).probability,
    0.5
);

close(
    hazeTie.outcomes.find(
        o=>o.enemyBoosts.spa===0
    ).probability,
    0.5
);

console.log('Haze and setup order branching: PASS');

const blocked=run({
    ownMove:'Stealth Rock',
    own:{...own,status:'par'}
});

close(
    blocked.outcomes.filter(
        o=>o.enemyConditions['Stealth Rock']===1
    ).reduce((sum,o)=>sum+o.probability,0),
    0.75
);

assert.ok(
    blocked.outcomes.some(
        o=>!o.enemyConditions['Stealth Rock']
    )
);

console.log('Paralysis and field branching: PASS');

const ko=run({
    ownMove:'Stealth Rock',
    own:{...own,curHP:20},
    orderCalculator:()=>({firstChance:0})
});

close(ko.ownKOChance,1);

assert.equal(
    ko.outcomes[0].enemyConditions['Stealth Rock'],
    undefined
);

console.log('KO prevents field action: PASS');

const reserve={
    species:'Gyarados',
    level:50,
    ability:'Intimidate',
    nature:'Hardy'
};

const valued=run({
    ownMove:'Stealth Rock',
    enemyReserves:[reserve]
});

assert.ok(
    valued.expectedChange>rock.expectedChange
);

const existing={Spikes:1};

run({
    ownMove:'Spikes',
    enemyConditions:existing
});

assert.deepEqual(existing,{Spikes:1});
assert.equal(boosted.boosts.spa,3);

console.log('Hazard valuation and input protection: PASS');

console.log('\n=== FIELD TURN RESULTS ===');

console.table([
    ['Neutral',neutral],
    ['Stealth Rock',rock],
    ['Both hazards',double],
    ['Three Spikes',layers],
    ['Haze first',haze],
    ['Haze second',lateHaze],
    ['Haze speed tie',hazeTie],
    ['Paralyzed setter',blocked],
    ['Hazard valuation',valued]
].map(([scenario,r])=>({
    scenario,
    ownHP:Number(r.expectedOwnHP.toFixed(4)),
    enemyHP:Number(r.expectedEnemyHP.toFixed(4)),
    valueChange:Number(r.expectedChange.toFixed(6)),
    outcomes:r.outcomes.length,
    probability:r.probabilitySum
})));

console.log('FIELD TURN V06 TEST: PASS');