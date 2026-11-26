const assert=require('node:assert/strict');

const {
    predictIntegratedTurnV06:predict
}=require('../src/turn_prediction_v06_integrated');

const {
    predictTurnV06
}=require('../src/turn_prediction_v06');

const {
    createSleepState
}=require('../src/sleep_prediction');

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

const close=(a,b)=>{
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
};

const fixedOrder=p=>()=>({
    firstChance:p
});

const fixedDamage=damage=>()=>({
    rolls:[damage]
});

const base={
    own,
    enemy,
    ownMove:'Surf',
    enemyMove:'Surf',
    orderCalculator:fixedOrder(1),
    damageCalculator:fixedDamage(40)
};

const old=predictTurnV06(base);
const integrated=predict(base);

for (const key of [
    'expectedValue',
    'expectedChange',
    'expectedOwnHP',
    'expectedEnemyHP',
    'ownKOChance',
    'enemyKOChance',
    'probabilitySum'
]) {
    close(old[key],integrated[key]);
}

console.log('Neutral compatibility: PASS');

const sleepFirst=predict({
    ...base,
    ownMove:'Spore'
});

close(sleepFirst.expectedOwnHP,100);

assert.equal(
    sleepFirst.outcomes[0].enemyStatus,
    'slp'
);

assert.equal(
    sleepFirst.outcomes[0]
        .enemyConfig.sleepState.elapsed,
    1
);

const sleepSecond=predict({
    ...base,
    ownMove:'Spore',
    orderCalculator:fixedOrder(0)
});

close(sleepSecond.expectedOwnHP,60);

assert.equal(
    sleepSecond.outcomes[0]
        .enemyConfig.sleepState.elapsed,
    0
);

console.log('Sleep timing: PASS');

const next=predict({
    ...base,
    own:sleepFirst.outcomes[0].ownConfig,
    enemy:sleepFirst.outcomes[0].enemyConfig,
    ownMove:'Calm Mind'
});

close(next.expectedOwnHP,90);

close(
    next.outcomes.filter(
        o=>o.enemyStatus===null
    ).reduce(
        (sum,o)=>sum+o.probability,0
    ),
    0.25
);

console.log('Sleep state continuation: PASS');

const paralysis=predict({
    ...base,
    ownMove:'Thunder Wave'
});

close(paralysis.expectedOwnHP,70);

assert.ok(
    paralysis.outcomes.every(
        o=>o.enemyStatus==='par'
    )
);

console.log('Same-turn paralysis: PASS');

const magic=predict({
    ...base,
    enemy:{
        ...enemy,
        species:'Clefable',
        ability:'Magic Guard'
    },
    ownMove:'Thunder Wave'
});

close(magic.expectedOwnHP,60);

console.log('Magic Guard integration: PASS');

const burn=predict({
    ...base,
    ownMove:'Will-O-Wisp',
    enemyMove:'Earthquake',
    damageCalculator:({attacker})=>({
        rolls:[
            attacker.status==='brn'
                ? 20 : 40
        ]
    })
});

close(burn.expectedOwnHP,75);

close(
    burn.outcomes.filter(
        o=>o.enemyStatus==='brn'
    ).reduce(
        (sum,o)=>sum+o.probability,0
    ),
    0.75
);

assert.ok(
    burn.outcomes.filter(
        o=>o.enemyStatus==='brn'
    ).every(o=>o.enemyHP<100)
);

console.log('Burn and residual integration: PASS');

const toxic=predict({
    ...base,
    ownMove:'Toxic'
});

const poisoned=toxic.outcomes.find(
    o=>o.enemyStatus==='tox'
);

assert.equal(
    poisoned.enemyConfig.toxicCounter,1
);

const toxicNext=predict({
    ...base,
    own:poisoned.ownConfig,
    enemy:poisoned.enemyConfig,
    ownMove:'Calm Mind'
});

assert.equal(
    toxicNext.outcomes[0]
        .enemyConfig.toxicCounter,
    2
);

assert.ok(
    toxicNext.expectedEnemyHP<
    poisoned.enemyHP
);

console.log('Toxic state continuation: PASS');

const freeze=predict({
    ...base,
    own:{
        ...own,
        status:'frz'
    }
});

close(freeze.expectedEnemyHP,92);

close(
    freeze.outcomes.filter(
        o=>o.ownStatus===null
    ).reduce(
        (sum,o)=>sum+o.probability,0
    ),
    0.20
);

console.log('Freeze integration: PASS');

const knockout=predict({
    ...base,
    ownMove:'Spore',
    orderCalculator:fixedOrder(0),
    damageCalculator:fixedDamage(200)
});

assert.equal(knockout.ownKOChance,1);
assert.equal(
    knockout.outcomes[0].enemyStatus,
    null
);

console.log('KO prevents status move: PASS');

const noResidual=predict({
    ...base,
    ownMove:'Toxic',
    residual:false
});

assert.ok(
    noResidual.outcomes.every(
        o=>o.enemyHP===100
    )
);

console.log('Residual toggle: PASS');

assert.throws(
    ()=>predict({
        ...base,
        own:{...own,status:'slp'}
    }),
    /Missing sleep state/
);

assert.equal(own.status,undefined);
assert.equal(enemy.curHP,100);

console.log('State validation and input protection: PASS');

console.log('\n=== INTEGRATED TURN RESULTS ===');

console.table([
    ['Spore first',sleepFirst],
    ['Spore second',sleepSecond],
    ['Sleep next turn',next],
    ['Thunder Wave',paralysis],
    ['Will-O-Wisp',burn],
    ['Toxic',toxic],
    ['Frozen attacker',freeze]
].map(([scenario,r])=>({
    scenario,
    ownHP:Number(r.expectedOwnHP.toFixed(4)),
    enemyHP:Number(r.expectedEnemyHP.toFixed(4)),
    valueChange:Number(r.expectedChange.toFixed(4)),
    outcomes:r.outcomes.length,
    probability:Number(r.probabilitySum.toFixed(8))
})));

console.log('INTEGRATED TURN V06 TEST: PASS');