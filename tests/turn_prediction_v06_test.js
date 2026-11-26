const assert=require('node:assert/strict');

const {
    predictTurnV06
}=require('../src/turn_prediction_v06');

const {
    predictAttackTurn
}=require('../src/attack_prediction');

const own={
    species:'Suicune',
    level:50,
    nature:'Hardy',
    ability:'Pressure',
    curHP:80,
    boosts:{}
};

const enemy={
    species:'Starmie',
    level:50,
    nature:'Hardy',
    ability:'Natural Cure',
    boosts:{}
};

const close=(a,b)=>{
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
};

const fixedOrder=firstChance=>
    ()=>({firstChance});

const fixedDamage=damage=>
    ()=>({rolls:[damage]});

const common={
    own,
    enemy,
    ownMove:'Recover',
    enemyMove:'Surf',
    damageCalculator:fixedDamage(100)
};

const first=predictTurnV06({
    ...common,
    orderCalculator:fixedOrder(1)
});

const second=predictTurnV06({
    ...common,
    orderCalculator:fixedOrder(0)
});

assert.equal(first.ownKOChance,0);
assert.equal(second.ownKOChance,1);

console.log('Recovery action order: PASS');

const tie=predictTurnV06({
    ...common,
    orderCalculator:fixedOrder(0.5)
});

close(tie.ownKOChance,0.5);
close(tie.probabilitySum,1);

console.log('Speed tie probability: PASS');

const boostedDamage=({defender})=>({
    rolls:[
        defender.boosts?.spd>0 ? 40 : 60
    ]
});

const setup={
    own,
    enemy,
    ownMove:'Calm Mind',
    enemyMove:'Surf',
    damageCalculator:boostedDamage
};

const setupFirst=predictTurnV06({
    ...setup,
    orderCalculator:fixedOrder(1)
});

const setupSecond=predictTurnV06({
    ...setup,
    orderCalculator:fixedOrder(0)
});

close(setupFirst.expectedOwnHP,40);
close(setupSecond.expectedOwnHP,20);

assert.equal(
    setupFirst.outcomes[0].ownBoosts.spd,1
);

assert.equal(
    setupSecond.outcomes[0].ownBoosts.spd,1
);

console.log('Boost before damage: PASS');

const failedSetup=predictTurnV06({
    ...setup,
    damageCalculator:fixedDamage(100),
    orderCalculator:fixedOrder(0)
});

assert.equal(failedSetup.ownKOChance,1);
assert.equal(
    failedSetup.outcomes[0].ownBoosts.spd,0
);

console.log('KO prevents setup: PASS');

const bothSetup=predictTurnV06({
    own,
    enemy,
    ownMove:'Calm Mind',
    enemyMove:'Agility'
});

assert.equal(
    bothSetup.outcomes[0].ownBoosts.spa,1
);

assert.equal(
    bothSetup.outcomes[0].enemyBoosts.spe,2
);

close(bothSetup.probabilitySum,1);

console.log('Status versus status: PASS');

const realFirst=predictTurnV06({
    ...setup,
    damageCalculator:undefined,
    orderCalculator:fixedOrder(1)
});

const realSecond=predictTurnV06({
    ...setup,
    damageCalculator:undefined,
    orderCalculator:fixedOrder(0)
});

assert.ok(
    realFirst.expectedOwnHP>
    realSecond.expectedOwnHP
);

console.log('Real damage recalculation: PASS');

const attacks={
    own,
    enemy,
    ownMove:'Surf',
    enemyMove:'Thunderbolt'
};

const oldResult=predictAttackTurn(attacks);
const newResult=predictTurnV06(attacks);

for (const key of [
    'expectedValue',
    'expectedChange',
    'expectedOwnHP',
    'expectedEnemyHP',
    'ownKOChance',
    'enemyKOChance',
    'probabilitySum'
]) {
    close(oldResult[key],newResult[key]);
}

console.log('Neutral attack compatibility: PASS');

assert.throws(
    ()=>predictTurnV06({
        ...common,
        ownMove:'Roost'
    }),
    /Unsupported status move/
);

assert.deepEqual(own.boosts,{});
assert.equal(own.curHP,80);

console.log('Unsupported move and input protection: PASS');

console.log('\n=== TURN PREDICTION ===');

console.table([
    ['Recover first',first],
    ['Recover second',second],
    ['Recover speed tie',tie],
    ['Calm Mind first',realFirst],
    ['Calm Mind second',realSecond]
].map(([scenario,r])=>({
    scenario,
    expectedHP:Number(
        r.expectedOwnHP.toFixed(4)
    ),
    koChance:Number(
        r.ownKOChance.toFixed(4)
    ),
    valueChange:Number(
        r.expectedChange.toFixed(4)
    )
})));

console.log('TURN PREDICTION V06 TEST: PASS');