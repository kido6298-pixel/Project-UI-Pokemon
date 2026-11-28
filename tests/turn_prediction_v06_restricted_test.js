const assert=require('node:assert/strict');

const {
    predictRestrictedTurnV06:predict
}=require('../src/turn_prediction_v06_restricted');

const {
    predictControlTurnV06:previous
}=require('../src/turn_prediction_v06_control');

const own={
    species:'Gyarados',
    level:50,
    nature:'Hardy',
    ability:'Intimidate',
    curHP:100
};

const enemy={
    species:'Suicune',
    level:50,
    nature:'Hardy',
    ability:'Pressure',
    curHP:100,
    lastMove:'Calm Mind',
    moveSlots:[
        {id:'calmmind',pp:10},
        {id:'surf',pp:10}
    ]
};

const base={
    own,enemy,
    ownMove:'Waterfall',
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

close(
    neutral.expectedValue,
    previous(base).expectedValue
);

assert.equal(
    neutral.outcomes[0].enemyConfig.lastMove,
    'surf'
);

assert.equal(
    neutral.outcomes[0]
        .enemyConfig.moveSlots[1].pp,9
);

console.log('Compatibility and move history: PASS');

const taunt=run({
    ownMove:'Taunt',
    enemyMove:'Calm Mind'
});

assert.equal(taunt.outcomes.length,3);

for (const o of taunt.outcomes) {
    assert.equal(o.enemyBoosts.spa,0);
    assert.equal(o.enemyBoosts.spd,0);
    assert.equal(o.enemyConfig.moveSlots[0].pp,10);
    close(o.probability,1/3);
}

console.log('Taunt before setup: PASS');

const lateTaunt=run({
    ownMove:'Taunt',
    enemyMove:'Calm Mind',
    orderCalculator:()=>({firstChance:0})
});

for (const o of lateTaunt.outcomes) {
    assert.equal(o.enemyBoosts.spa,1);
    assert.equal(o.enemyConfig.moveSlots[0].pp,9);
}

console.log('Taunt after setup: PASS');

const attackUnderTaunt=run({
    ownMove:'Taunt',
    enemyMove:'Surf'
});

close(attackUnderTaunt.expectedOwnHP,60);

console.log('Attack under Taunt: PASS');

const encore=run({
    ownMove:'Encore',
    enemyMove:'Surf'
});

assert.equal(encore.outcomes.length,5);

for (const o of encore.outcomes) {
    assert.equal(o.enemyBoosts.spa,1);
    assert.equal(o.enemyConfig.lastMove,'calmmind');
    assert.equal(o.enemyConfig.moveSlots[0].pp,9);
    assert.equal(o.enemyConfig.moveSlots[1].pp,10);
    assert.equal(
        o.enemyConfig.restrictions.encore.move,
        'calmmind'
    );
    close(o.probability,0.2);
}

close(encore.expectedOwnHP,100);

console.log('Encore overrides pending move: PASS');

const lateEncore=run({
    ownMove:'Encore',
    enemyMove:'Surf',
    orderCalculator:()=>({firstChance:0})
});

close(lateEncore.expectedOwnHP,60);

for (const o of lateEncore.outcomes) {
    assert.equal(
        o.enemyConfig.restrictions.encore.move,
        'surf'
    );
}

console.log('Encore uses latest move history: PASS');

const locked=encore.outcomes[0];

const continuation=run({
    own:locked.ownConfig,
    enemy:locked.enemyConfig,
    ownMove:'Waterfall',
    enemyMove:'Surf'
});

assert.equal(
    continuation.outcomes[0].enemyBoosts.spa,2
);

close(continuation.expectedOwnHP,100);

console.log('Restriction continuation: PASS');

const combined=run({
    ownMove:'Taunt',
    enemyMove:'Surf',
    enemy:locked.enemyConfig
});

for (const o of combined.outcomes) {
    assert.equal(o.enemyBoosts.spa,1);
    assert.equal(
        o.enemyConfig.moveSlots[0].pp,9
    );
}

console.log('Taunt and Encore interaction: PASS');

const duration=run({
    ownMove:'Taunt',
    enemyMove:'Calm Mind',
    residual:true
});

assert.deepEqual(
    duration.outcomes.map(
        o=>o.enemyConfig.restrictions.taunt.remaining
    ).sort((a,b)=>a-b),
    [2,3,4]
);

console.log('Restriction duration tick: PASS');

const expired=run({
    enemy:{
        ...enemy,
        restrictions:{
            taunt:{remaining:1}
        }
    },
    enemyMove:'Calm Mind',
    residual:true
});

assert.equal(
    expired.outcomes[0]
        .enemyConfig.restrictions.taunt,
    undefined
);

assert.equal(
    expired.outcomes[0].enemyBoosts.spa,0
);

console.log('Restriction expiration: PASS');

const exhausted=run({
    ownMove:'Encore',
    enemy:{
        ...enemy,
        moveSlots:[
            {id:'calmmind',pp:1},
            {id:'surf',pp:10}
        ]
    },
    residual:true
});

for (const o of exhausted.outcomes) {
    assert.equal(
        o.enemyConfig.restrictions.encore,
        undefined
    );

    assert.equal(
        o.enemyConfig.moveSlots[0].pp,0
    );
}

console.log('Encore PP exhaustion: PASS');

const noHistory=run({
    ownMove:'Encore',
    enemy:{...enemy,lastMove:null}
});

close(noHistory.expectedOwnHP,60);

assert.equal(
    noHistory.outcomes[0]
        .enemyConfig.restrictions.encore,
    undefined
);

console.log('Encore without history: PASS');

const blocked=run({
    ownMove:'Taunt',
    own:{...own,status:'par'},
    enemyMove:'Calm Mind'
});

close(
    blocked.outcomes.filter(
        o=>o.enemyBoosts.spa===1
    ).reduce((sum,o)=>sum+o.probability,0),
    0.25
);

console.log('Paralysis and restriction branching: PASS');

const pressure=run({
    own:{
        ...own,
        moveSlots:[
            {id:'waterfall',pp:10}
        ]
    }
});

assert.equal(
    pressure.outcomes[0].ownConfig.moveSlots[0].pp,
    8
);

console.log('Pressure PP consumption: PASS');

assert.equal(enemy.moveSlots[0].pp,10);
assert.equal(enemy.moveSlots[1].pp,10);
assert.equal(enemy.restrictions,undefined);

console.log('Input protection: PASS');

console.log('\n=== RESTRICTION TURN RESULTS ===');

console.table([
    ['Neutral',neutral],
    ['Taunt first',taunt],
    ['Taunt second',lateTaunt],
    ['Encore first',encore],
    ['Encore second',lateEncore],
    ['Taunt + Encore',combined],
    ['Paralyzed Taunt',blocked]
].map(([scenario,r])=>({
    scenario,
    ownHP:r.expectedOwnHP,
    enemyHP:r.expectedEnemyHP,
    outcomes:r.outcomes.length,
    probability:r.probabilitySum
})));

console.log('RESTRICTED TURN V06 TEST: PASS');