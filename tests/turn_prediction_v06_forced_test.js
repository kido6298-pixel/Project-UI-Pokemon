const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06');

const {
    predictPartyTurnV06:predict
}=require('../src/turn_prediction_v06_forced');

function p(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

const own=createParty({
    active:p('Skarmory','Keen Eye',{
        curHP:100,
        moveSlots:[
            {id:'roar',pp:10},
            {id:'whirlwind',pp:10}
        ]
    }),
    reserves:[
        p('Starmie','Natural Cure')
    ]
});

const enemy=createParty({
    active:p('Suicune','Pressure',{
        curHP:100,
        boosts:{spa:2,spd:2},
        moveSlots:[
            {id:'calmmind',pp:10},
            {id:'surf',pp:10}
        ]
    }),
    reserves:[
        p('Gyarados','Intimidate'),
        p('Garchomp','Sand Veil')
    ]
});

const base={
    own,enemy,
    ownAction:{type:'move',move:'Roar'},
    enemyAction:{type:'move',move:'Calm Mind'},
    residual:false,
    damageCalculator:()=>({rolls:[40]})
};

function close(a,b) {
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
}

function run(changes={}) {
    const r=predict({...base,...changes});
    close(r.probabilitySum,1);
    return r;
}

const setup=run();

assert.equal(setup.outcomes.length,2);

for (const o of setup.outcomes) {
    close(o.probability,0.5);

    const event=o.forcedSwitchEvents[0];

    assert.equal(event.success,true);
    assert.equal(event.outgoing,'Suicune');

    const old=o.enemy.reserves.find(
        p=>p.species==='Suicune'
    );

    assert.equal(old.boosts.spa,0);
    assert.equal(old.boosts.spd,0);
    assert.equal(old.currentHP,100);
    assert.equal(old.moveSlots[0].pp,9);
    assert.equal(o.own.active.moveSlots[0].pp,8);
}

console.log('Setup followed by Roar: PASS');

const attack=run({
    enemyAction:{type:'move',move:'Surf'}
});

assert.equal(attack.expectedOwnHP,60);

console.log('Attack before forced switch: PASS');

const first=run({
    orderCalculator:()=>({firstChance:1}),
    enemyAction:{type:'move',move:'Surf'}
});

assert.equal(first.expectedOwnHP,100);

for (const o of first.outcomes) {
    const old=o.enemy.reserves.find(
        p=>p.species==='Suicune'
    );

    assert.equal(old.moveSlots[1].pp,10);
    assert.equal(o.enemy.active.lastMove,null);
}

console.log('Pending action cancellation: PASS');

const noReserve=run({
    enemy:{...enemy,reserves:[]}
});

assert.equal(noReserve.outcomes.length,1);

assert.equal(
    noReserve.outcomes[0].enemy.active.species,
    'Suicune'
);

assert.equal(
    noReserve.outcomes[0].enemy.active.boosts.spa,
    3
);

assert.equal(
    noReserve.outcomes[0].forcedSwitchEvents[0].reason,
    'no_reserves'
);

console.log('No reserve failure: PASS');

const rock=run({
    enemy:{
        ...enemy,
        conditions:{'Stealth Rock':1}
    }
});

for (const o of rock.outcomes) {
    const incoming=o.enemy.active;

    const divisor=
        incoming.species==='Gyarados'?4:16;

    assert.equal(
        incoming.currentHP,
        incoming.maxHP-
        Math.floor(incoming.maxHP/divisor)
    );
}

console.log('Forced entry hazards: PASS');

const soundproof=createParty({
    active:p('Exploud','Soundproof',{
        curHP:100
    }),
    reserves:[
        p('Garchomp','Sand Veil')
    ]
});

const blocked=run({
    enemy:soundproof,
    enemyAction:{type:'move',move:'Surf'}
});

assert.equal(
    blocked.outcomes[0].forcedSwitchEvents[0].reason,
    'soundproof'
);

const whirlwind=run({
    enemy:soundproof,
    ownAction:{type:'move',move:'Whirlwind'},
    enemyAction:{type:'move',move:'Surf'}
});

assert.equal(
    whirlwind.outcomes[0].enemy.active.species,
    'Garchomp'
);

console.log('Roar and Whirlwind distinction: PASS');

const suction=createParty({
    active:p('Cradily','Suction Cups'),
    reserves:[p('Garchomp','Sand Veil')]
});

const rooted=run({
    enemy:suction,
    enemyAction:{type:'move',move:'Recover'}
});

assert.equal(
    rooted.outcomes[0].forcedSwitchEvents[0].reason,
    'suction_cups'
);

console.log('Suction Cups: PASS');

const doomed=createParty({
    active:p('Suicune','Pressure',{
        curHP:100
    }),
    reserves:[
        p('Gyarados','Intimidate',{curHP:1})
    ],
    conditions:{'Stealth Rock':1}
});

const ko=run({enemy:doomed});

assert.equal(ko.expectedEnemyHP,0);

assert.equal(
    ko.outcomes[0].enemyNeedsReplacement,true
);

console.log('Forced entry KO: PASS');

const voluntary=run({
    enemyAction:{type:'switch',index:0}
});

for (const o of voluntary.outcomes) {
    assert.notEqual(
        o.enemy.active.species,
        'Gyarados'
    );

    assert.equal(
        o.forcedSwitchEvents[0].outgoing,
        'Gyarados'
    );
}

console.log('Voluntary switch followed by Roar: PASS');

const reverse=run({
    own:enemy,
    enemy:own,
    ownAction:{type:'move',move:'Calm Mind'},
    enemyAction:{type:'move',move:'Roar'}
});

assert.equal(reverse.outcomes.length,2);

for (const o of reverse.outcomes) {
    assert.equal(
        o.forcedSwitchEvents[0].side,'enemy'
    );

    assert.notEqual(
        o.own.active.species,'Suicune'
    );
}

console.log('Opponent forced switch: PASS');

assert.equal(enemy.active.boosts.spa,2);
assert.equal(enemy.active.moveSlots[0].pp,10);
assert.equal(own.active.moveSlots[0].pp,10);

console.log('Input protection: PASS');

console.table([
    ['Setup and Roar',setup],
    ['Attack and Roar',attack],
    ['Pending cancellation',first],
    ['No reserves',noReserve],
    ['Entry hazards',rock],
    ['Entry KO',ko],
    ['Switch and Roar',voluntary]
].map(([scenario,r])=>({
    scenario,
    ownHP:r.expectedOwnHP,
    enemyHP:r.expectedEnemyHP,
    outcomes:r.outcomes.length,
    valueChange:r.expectedChange,
    probability:r.probabilitySum
})));

console.log('FORCED TURN V06 TEST: PASS');