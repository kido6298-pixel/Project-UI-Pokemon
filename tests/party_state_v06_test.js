const assert=require('node:assert/strict');

const {
    createParty,
    memberConfig,
    evaluatePartyBoard,
    predictVoluntarySwitch:swap
}=require('../src/party_state_v06');

const {
    evaluateHazards
}=require('../src/hazards_v06');

const {
    predictForcedSwitch
}=require('../src/switch_control_v06_corrected');

function config(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

function close(a,b) {
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
}

const starmie=config(
    'Starmie','Natural Cure',{
        curHP:100,
        moveSlots:[
            {id:'surf',pp:7}
        ]
    }
);

const gyara=config(
    'Gyarados','Intimidate'
);

const chomp=config(
    'Garchomp','Sand Veil'
);

const own=createParty({
    active:starmie,
    reserves:[gyara,chomp]
});

const enemy=createParty({
    active:config('Suicune','Pressure')
});

const initial=evaluatePartyBoard({own,enemy});

assert.equal(initial.own.alive,3);
assert.equal(initial.enemy.alive,1);

console.log('Full party evaluation: PASS');

const changed=swap({
    party:own,index:0
});

const after=evaluatePartyBoard({
    own:changed.party,enemy
});

close(initial.advantage,after.advantage);

assert.equal(
    changed.party.active.species,
    'Gyarados'
);

assert.equal(
    changed.party.reserves[0].species,
    'Starmie'
);

assert.equal(
    changed.party.reserves[0].currentHP,100
);

assert.equal(
    changed.party.reserves[0].moveSlots[0].pp,7
);

console.log('Switch preserves total party value: PASS');

const back=swap({
    party:changed.party,index:0
});

close(
    evaluatePartyBoard({
        own:back.party,enemy
    }).advantage,
    initial.advantage
);

console.log('Repeated switch conservation: PASS');

const boosted=createParty({
    active:{
        ...starmie,
        boosts:{spa:2,spd:2},
        status:'par',
        restrictions:{
            taunt:{remaining:2}
        },
        lastMove:'surf'
    },
    reserves:[gyara]
});

const reset=swap({
    party:boosted,index:0
}).party.reserves[0];

assert.equal(reset.status,null);
assert.equal(reset.boosts.spa,0);
assert.equal(reset.restrictions.taunt,undefined);
assert.equal(reset.lastMove,null);
assert.equal(reset.moveSlots[0].pp,7);

const restored=memberConfig(reset);

assert.equal(restored.status,'');
assert.equal(restored.restrictions.taunt,undefined);
assert.equal(restored.lastMove,null);

console.log('Switch reset and configuration sync: PASS');

const rockParty=createParty({
    active:starmie,
    reserves:[gyara,chomp],
    conditions:{'Stealth Rock':1}
});

const rock=swap({
    party:rockParty,index:0
});

assert.equal(
    rock.party.active.currentHP,
    rockParty.reserves[0].maxHP-
    Math.floor(rockParty.reserves[0].maxHP/4)
);

assert.equal(
    rock.party.reserves[0].currentHP,100
);

console.log('Entry hazard and outgoing HP: PASS');

const doomed=createParty({
    active:starmie,
    reserves:[{...gyara,curHP:1}],
    conditions:{'Stealth Rock':1}
});

const ko=swap({
    party:doomed,index:0
});

assert.equal(ko.faintedOnEntry,true);
assert.equal(ko.party.active.currentHP,0);

assert.equal(
    evaluatePartyBoard({
        own:ko.party,enemy
    }).own.alive,1
);

console.log('Entry KO and alive count: PASS');

const clefable=config(
    'Clefable','Magic Guard'
);

const hazards={
    'Stealth Rock':1,
    Spikes:3,
    'Toxic Spikes':2
};

const immune=evaluateHazards(
    clefable,hazards
);

assert.equal(immune.totalDamage,0);
assert.equal(immune.toxicSpikes,null);

const magicParty=createParty({
    active:starmie,
    reserves:[clefable],
    conditions:hazards
});

const magic=swap({
    party:magicParty,index:0
});

assert.equal(magic.party.active.status,null);

assert.equal(
    magic.party.active.currentHP,
    magic.party.active.maxHP
);

assert.equal(
    evaluatePartyBoard({
        own:magicParty,enemy
    }).hazards.ownPressure.value,0
);

console.log('Gen IV Magic Guard correction: PASS');

const poisonParty=createParty({
    active:starmie,
    reserves:[
        config('Tentacruel','Clear Body')
    ],
    conditions:{'Toxic Spikes':2}
});

const absorbed=swap({
    party:poisonParty,index:0
});

assert.equal(absorbed.absorbed,true);
assert.equal(
    absorbed.party.conditions['Toxic Spikes'],
    undefined
);

console.log('Toxic Spikes absorption: PASS');

const forced=predictForcedSwitch({
    actor:enemy.active,
    target:own.active,
    reserves:own.reserves,
    moveName:'Roar'
});

assert.equal(forced.outcomes.length,2);

for (const o of forced.outcomes) {
    close(o.probability,0.5);

    const party={
        active:o.active,
        reserves:o.reserves,
        conditions:o.conditions
    };

    close(
        evaluatePartyBoard({
            own:party,enemy
        }).advantage,
        initial.advantage
    );
}

console.log('Forced switch party conservation: PASS');

assert.throws(()=>swap({
    party:own,index:2
}));

assert.throws(()=>swap({
    party:own,index:0,trapped:true
}));

assert.throws(()=>swap({
    party:createParty({
        active:starmie,
        reserves:[{...gyara,curHP:0}]
    }),
    index:0
}));

assert.equal(own.active.species,'Starmie');
assert.equal(own.reserves[0].species,'Gyarados');
assert.equal(own.active.moveSlots[0].pp,7);

console.log('Invalid actions and input protection: PASS');

console.table([
    {
        scenario:'Before switch',
        value:initial.advantage,
        alive:initial.own.alive
    },
    {
        scenario:'After switch',
        value:after.advantage,
        alive:after.own.alive
    },
    {
        scenario:'Entry KO',
        value:evaluatePartyBoard({
            own:ko.party,enemy
        }).advantage,
        alive:1
    }
]);

console.log('PARTY STATE V06 TEST: PASS');