const assert=require('node:assert/strict');
const {Pokemon,Generations}=require('@smogon/calc');

const {
    predictSwitchOut,
    predictSwitchEntry,
    predictForcedSwitch:predict
}=require('../src/switch_control_v06');

const gen=Generations.get(4);

function pokemon(species,ability='',extra={}) {
    const config={
        species,
        ability,
        level:50,
        nature:'Hardy'
    };

    const p=new Pokemon(gen,species,config);

    return {
        species,
        ability,
        item:'',
        config,
        currentHP:p.maxHP(),
        maxHP:p.maxHP(),
        status:null,
        boosts:{},
        active:false,
        ...extra
    };
}

const actor=pokemon(
    'Skarmory','Keen Eye',
    {active:true}
);

const target=pokemon(
    'Suicune','Pressure',{
        active:true,
        boosts:{spa:3,spd:3},
        status:'tox',
        toxicCounter:4,
        restrictions:{
            taunt:{remaining:2},
            encore:{remaining:3,move:'calmmind'}
        },
        lastMove:'Calm Mind'
    }
);

const gyarados=pokemon(
    'Gyarados','Intimidate'
);

const garchomp=pokemon(
    'Garchomp','Sand Veil'
);

const base={
    actor,
    target,
    reserves:[gyarados,garchomp],
    moveName:'Whirlwind',
    conditions:{}
};

function run(changes={}) {
    return predict({...base,...changes});
}

function close(a,b) {
    assert.ok(Math.abs(a-b)<1e-8);
}

const result=run();

assert.equal(result.successProbability,1);
assert.equal(result.priority,-6);
assert.equal(result.outcomes.length,2);

for (const outcome of result.outcomes) {
    close(outcome.probability,0.5);

    const old=outcome.reserves[
        outcome.selectedIndex
    ];

    assert.equal(old.species,'Suicune');
    assert.equal(old.active,false);
    assert.equal(old.status,'tox');
    assert.equal(old.toxicCounter,0);
    assert.equal(old.lastMove,null);

    assert.equal(
        old.restrictions.taunt,undefined
    );

    assert.equal(
        old.restrictions.encore,undefined
    );

    assert.ok(
        Object.values(old.boosts)
            .every(x=>x===0)
    );

    assert.equal(
        outcome.cancelPendingAction,true
    );
}

console.log('Forced switch and boost reset: PASS');

const single=run({
    reserves:[
        gyarados,
        {...garchomp,currentHP:0,fainted:true}
    ]
});

assert.equal(single.outcomes.length,1);
assert.equal(single.outcomes[0].probability,1);
assert.equal(single.outcomes[0].active.species,'Gyarados');

console.log('Eligible reserve selection: PASS');

assert.equal(
    run({reserves:[]}).outcomes[0].reason,
    'no_reserves'
);

assert.equal(
    run({
        reserves:[
            {...gyarados,currentHP:0}
        ]
    }).successProbability,0
);

console.log('No reserve failure: PASS');

const rock=run({
    conditions:{'Stealth Rock':1}
});

const gyara=rock.outcomes.find(
    o=>o.active.species==='Gyarados'
);

const chomp=rock.outcomes.find(
    o=>o.active.species==='Garchomp'
);

assert.equal(
    gyara.active.currentHP,
    gyarados.maxHP-Math.floor(
        gyarados.maxHP/4
    )
);

assert.equal(
    chomp.active.currentHP,
    garchomp.maxHP-Math.floor(
        garchomp.maxHP/16
    )
);

console.log('Forced switch entry damage: PASS');

const toxic=run({
    reserves:[garchomp],
    conditions:{'Toxic Spikes':2}
}).outcomes[0];

assert.equal(toxic.active.status,'tox');
assert.equal(toxic.active.toxicCounter,0);

console.log('Toxic Spikes infliction: PASS');

const tentacruel=pokemon(
    'Tentacruel','Clear Body'
);

const absorbed=run({
    reserves:[tentacruel],
    conditions:{
        'Toxic Spikes':2,
        'Stealth Rock':1
    }
}).outcomes[0];

assert.equal(absorbed.absorbed,true);

assert.equal(
    absorbed.conditions['Toxic Spikes'],
    undefined
);

assert.equal(
    absorbed.conditions['Stealth Rock'],1
);

console.log('Toxic Spikes absorption: PASS');

const entryKO=run({
    reserves:[
        {...gyarados,currentHP:1}
    ],
    conditions:{'Stealth Rock':1}
}).outcomes[0];

assert.equal(entryKO.active.currentHP,0);
assert.equal(entryKO.faintedOnEntry,true);

console.log('Entry KO handling: PASS');

const cradily=pokemon(
    'Cradily','Suction Cups',
    {active:true}
);

assert.equal(
    run({target:cradily}).outcomes[0].reason,
    'suction_cups'
);

assert.equal(
    run({
        target:cradily,
        actor:pokemon('Rampardos','Mold Breaker')
    }).successProbability,1
);

console.log('Suction Cups and Mold Breaker: PASS');

const exploud=pokemon(
    'Exploud','Soundproof',
    {active:true}
);

assert.equal(
    run({
        target:exploud,
        moveName:'Roar'
    }).outcomes[0].reason,
    'soundproof'
);

assert.equal(
    run({
        target:exploud,
        moveName:'Whirlwind'
    }).successProbability,1
);

console.log('Soundproof distinction: PASS');

assert.equal(
    run({
        target:{...target,ingrain:true}
    }).outcomes[0].reason,
    'ingrain'
);

assert.equal(
    run({
        conditions:{protect:true}
    }).outcomes[0].reason,
    'protect'
);

console.log('Ingrain and Protect: PASS');

const starmie=pokemon(
    'Starmie','Natural Cure',{
        status:'par',
        active:true
    }
);

assert.equal(
    predictSwitchOut(starmie).status,null
);

const lumEntry=predictSwitchEntry({
    candidate:{
        ...garchomp,
        item:'Lum Berry'
    },
    conditions:{'Toxic Spikes':2}
});

assert.equal(lumEntry.state.status,null);
assert.equal(lumEntry.state.item,'');

console.log('Natural Cure and Lum Berry: PASS');

assert.equal(target.boosts.spa,3);
assert.equal(target.toxicCounter,4);
assert.equal(target.active,true);
assert.equal(gyarados.active,false);

assert.equal(
    run({moveName:'Surf'}).supported,false
);

console.log('Input protection: PASS');

console.log('\n=== FORCED SWITCH RESULTS ===');

console.table(
    rock.outcomes.map(o=>({
        outgoing:target.species,
        incoming:o.active.species,
        probability:o.probability,
        entryDamage:o.hazards.totalDamage,
        remainingHP:o.active.currentHP
    }))
);

console.log('SWITCH CONTROL V06 TEST: PASS');