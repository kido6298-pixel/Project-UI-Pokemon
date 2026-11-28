const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06');

const {
    predictPartyTurnV06:predict
}=require('../src/turn_prediction_v06_party');

function p(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

const own=createParty({
    active:p('Starmie','Natural Cure',{
        curHP:100
    }),
    reserves:[
        p('Gyarados','Intimidate',{
            curHP:100
        }),
        p('Garchomp','Sand Veil')
    ]
});

const enemy=createParty({
    active:p('Suicune','Pressure',{
        curHP:100
    }),
    reserves:[
        p('Heatran','Flash Fire',{
            curHP:100
        })
    ]
});

const base={
    own,enemy,
    ownAction:{type:'switch',index:0},
    enemyAction:{type:'move',move:'Surf'},
    residual:false,
    damageCalculator:()=>({rolls:[40]})
};

function run(changes={}) {
    const r=predict({...base,...changes});

    assert.ok(
        Math.abs(r.probabilitySum-1)<1e-8
    );

    return r;
}

const incoming=run();

assert.equal(incoming.expectedOwnHP,60);

assert.equal(
    incoming.outcomes[0].own.active.species,
    'Gyarados'
);

assert.equal(
    incoming.outcomes[0].own.reserves[0].currentHP,
    100
);

assert.equal(
    incoming.outcomes[0].own.active.lastMove,
    null
);

console.log('Switch before attack: PASS');

const both=run({
    enemyAction:{type:'switch',index:0}
});

assert.equal(both.expectedOwnHP,100);
assert.equal(both.expectedEnemyHP,100);

assert.ok(
    Math.abs(both.expectedChange)<1e-8
);

console.log('Double switch conservation: PASS');

const setup=run({
    enemyAction:{type:'move',move:'Calm Mind'}
});

assert.equal(
    setup.outcomes[0].enemy.active.boosts.spa,1
);

assert.equal(setup.expectedOwnHP,100);

console.log('Switch against setup: PASS');

const reverse=run({
    ownAction:{type:'move',move:'Surf'},
    enemyAction:{type:'switch',index:0}
});

assert.equal(reverse.expectedEnemyHP,60);

assert.equal(
    reverse.outcomes[0].enemy.active.species,
    'Heatran'
);

console.log('Opponent switch: PASS');

const rock=run({
    own:{
        ...own,
        conditions:{'Stealth Rock':1}
    }
});

assert.equal(
    rock.expectedOwnHP,
    60-Math.floor(
        own.reserves[0].maxHP/4
    )
);

console.log('Hazards before incoming damage: PASS');

const doomed=structuredClone(own);
doomed.reserves[0].currentHP=1;
doomed.conditions={'Stealth Rock':1};

const ko=run({own:doomed});

assert.equal(ko.expectedOwnHP,0);

assert.equal(
    ko.outcomes[0].ownNeedsReplacement,
    true
);

console.log('Entry KO replacement flag: PASS');

const poisoned=structuredClone(own);
poisoned.reserves[0].status='psn';

const preserved=run({own:poisoned});

assert.equal(
    preserved.outcomes[0].own.active.status,
    'psn'
);

console.log('Incoming status preservation: PASS');

assert.throws(()=>run({
    ownTrapped:true
}));

assert.equal(own.active.species,'Starmie');
assert.equal(own.reserves[0].currentHP,100);

console.log('Trapping and input protection: PASS');

console.table([
    ['Switch and attack',incoming],
    ['Double switch',both],
    ['Switch and setup',setup],
    ['Opponent switch',reverse],
    ['Entry hazards',rock],
    ['Entry KO',ko]
].map(([scenario,r])=>({
    scenario,
    ownHP:r.expectedOwnHP,
    enemyHP:r.expectedEnemyHP,
    valueChange:r.expectedChange,
    probability:r.probabilitySum
})));

console.log('PARTY TURN V06 TEST: PASS');