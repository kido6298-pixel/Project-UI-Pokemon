const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06');

const {
    getReplacementOptions,
    getPartyStatus,
    predictReplacement:replace,
    enumerateReplacements,
    getBattleStatus,
    enumerateReplacementBoards
}=require('../src/replacement_v06');

function p(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

const own=createParty({
    active:p('Starmie','Natural Cure',{
        curHP:0
    }),
    reserves:[
        p('Gyarados','Intimidate',{
            curHP:100,
            moveSlots:[
                {id:'waterfall',pp:7}
            ]
        }),
        p('Garchomp','Sand Veil',{
            curHP:100
        })
    ]
});

const enemy=createParty({
    active:p('Suicune','Pressure',{
        curHP:100
    }),
    reserves:[
        p('Heatran','Flash Fire')
    ]
});

const original=structuredClone(own);

const options=getReplacementOptions(own);

assert.equal(options.length,2);
assert.equal(getPartyStatus(own).alive,2);
assert.equal(
    getPartyStatus(own).needsReplacement,true
);

console.log('Replacement candidates: PASS');

const result=replace({
    party:own,index:0
});

assert.equal(
    result.party.active.species,'Gyarados'
);

assert.equal(
    result.party.reserves[0].species,'Starmie'
);

assert.equal(
    result.party.reserves[0].currentHP,0
);

assert.equal(
    result.party.active.moveSlots[0].pp,7
);

assert.equal(result.alive,2);
assert.equal(result.needsReplacement,false);

console.log('Replacement state preservation: PASS');

assert.equal(
    enumerateReplacements({
        party:own
    }).length,2
);

console.log('All replacement candidates: PASS');

const rock=replace({
    party:{
        ...own,
        conditions:{'Stealth Rock':1}
    },
    index:0
});

assert.equal(
    rock.party.active.currentHP,
    100-Math.floor(
        own.reserves[0].maxHP/4
    )
);

console.log('Replacement entry hazards: PASS');

const doomed=structuredClone(own);

doomed.reserves[0].currentHP=1;
doomed.conditions={'Stealth Rock':1};

const first=replace({
    party:doomed,index:0
});

assert.equal(first.faintedOnEntry,true);
assert.equal(first.needsReplacement,true);
assert.equal(first.options.length,1);

const second=replace({
    party:first.party,index:1
});

assert.equal(
    second.party.active.species,'Garchomp'
);

assert.equal(second.needsReplacement,false);
assert.equal(second.alive,1);

console.log('Repeated entry KO replacement: PASS');

const defeated=structuredClone(own);

for (const member of defeated.reserves) {
    member.currentHP=0;
}

assert.equal(
    getPartyStatus(defeated).defeated,true
);

assert.equal(
    getBattleStatus({
        own:defeated,enemy
    }).winner,'enemy'
);

assert.equal(
    getBattleStatus({
        own:enemy,enemy:defeated
    }).winner,'own'
);

assert.equal(
    getBattleStatus({
        own:defeated,enemy:defeated
    }).winner,'DRAW'
);

console.log('Terminal board classification: PASS');

const boards=enumerateReplacementBoards({
    own,enemy
});

assert.equal(boards.length,2);

for (const board of boards) {
    assert.equal(board.enemyIndex,null);
    assert.equal(
        board.status.own.needsReplacement,
        false
    );
    assert.equal(
        Number.isFinite(board.value),true
    );
}

console.log('Replacement board evaluation: PASS');

const enemyKO=structuredClone(enemy);
enemyKO.active.currentHP=0;

const both=enumerateReplacementBoards({
    own,enemy:enemyKO
});

assert.equal(both.length,2);

for (const board of both) {
    assert.equal(
        board.enemy.active.species,
        'Heatran'
    );

    assert.equal(
        board.status.enemy.needsReplacement,
        false
    );
}

console.log('Simultaneous replacements: PASS');

assert.equal(
    enumerateReplacementBoards({
        own:result.party,enemy
    }).length,0
);

assert.equal(
    enumerateReplacementBoards({
        own:defeated,enemy
    }).length,0
);

console.log('No unnecessary replacements: PASS');

assert.throws(()=>replace({
    party:enemy,index:0
}));

assert.throws(()=>replace({
    party:own,index:9
}));

assert.throws(()=>replace({
    party:defeated,index:0
}));

assert.deepEqual(own,original);

console.log('Invalid actions and input protection: PASS');

console.table(boards.map(b=>({
    candidate:b.own.active.species,
    HP:b.own.active.currentHP,
    alive:b.status.own.alive,
    value:b.value
})));

console.log('REPLACEMENT V06 TEST: PASS');