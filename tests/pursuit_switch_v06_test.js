const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06_ability');

const {
    predictPursuitSwitch:predict
}=require('../src/pursuit_switch_v06');

function p(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

function party(active,reserves=[],conditions={}) {
    return createParty({
        active,reserves,conditions
    });
}

function attacker(extra={}) {
    return party(p('Tyranitar','Sand Stream',{
        moveSlots:[{id:'pursuit',pp:10}],
        ...extra
    }));
}

function defender(extra={},conditions={}) {
    return party(
        p('Gengar','Levitate',extra),
        [
            p('Gyarados','Intimidate'),
            p('Suicune','Pressure')
        ],
        conditions
    );
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function check(result) {
    assert.ok(
        Math.abs(result.probabilitySum-1)<1e-8
    );

    assert.ok(result.outcomes.length>0);
}

test('Surviving outgoing Pokemon switches',()=>{
    const d=defender();

    const result=predict({
        attacker:attacker(),
        defender:d,
        switchIndex:0,
        damageCalculator:()=>({rolls:[30]})
    });

    const o=result.outcomes[0];

    assert.equal(o.outgoingFainted,false);
    assert.equal(o.enemy.active.species,'Gyarados');

    assert.equal(
        o.enemy.reserves[0].currentHP,
        d.active.currentHP-30
    );

    assert.equal(
        o.own.active.boosts.atk,-1
    );

    assert.equal(
        o.own.active.moveSlots[0].pp,9
    );

    check(result);
});

test('KO followed by selected replacement',()=>{
    const result=predict({
        attacker:attacker(),
        defender:defender({curHP:20}),
        switchIndex:1,
        damageCalculator:()=>({rolls:[40]})
    });

    const o=result.outcomes[0];

    assert.equal(result.outgoingKOChance,1);
    assert.equal(o.enemy.active.species,'Suicune');

    assert.equal(
        o.enemy.reserves[1].species,'Gengar'
    );

    assert.equal(
        o.enemy.reserves[1].currentHP,0
    );

    assert.equal(
        o.own.active.moveSlots[0].pp,9
    );

    check(result);
});

test('KO probability and entry ability',()=>{
    const result=predict({
        attacker:attacker(),
        defender:defender({curHP:40}),
        switchIndex:0,
        damageCalculator:()=>({rolls:[20,60]})
    });

    assert.equal(result.outgoingKOChance,0.5);
    assert.equal(result.expectedDamage,30);

    for (const o of result.outcomes) {
        assert.equal(
            o.enemy.active.species,'Gyarados'
        );

        assert.equal(
            o.own.active.boosts.atk,-1
        );

        assert.equal(
            o.own.active.moveSlots[0].pp,9
        );
    }

    check(result);
});

test('Paralysis does not prevent enemy switch',()=>{
    const result=predict({
        attacker:attacker({status:'par'}),
        defender:defender(),
        switchIndex:0,
        damageCalculator:()=>({rolls:[40]})
    });

    const blocked=result.outcomes.find(
        o=>o.pursuitDamage===0
    );

    assert.equal(blocked.probability,0.25);

    assert.equal(
        blocked.own.active.moveSlots[0].pp,10
    );

    assert.equal(
        blocked.enemy.active.species,'Gyarados'
    );

    assert.equal(
        blocked.own.active.boosts.atk,-1
    );

    check(result);
});

test('Entry hazards applied once',()=>{
    const d=defender({},{
        'Stealth Rock':1
    });

    const result=predict({
        attacker:attacker(),
        defender:d,
        switchIndex:0,
        damageCalculator:()=>({rolls:[20]})
    });

    const o=result.outcomes[0];

    assert.equal(
        o.enemy.active.currentHP,
        d.reserves[0].maxHP-
            Math.floor(d.reserves[0].maxHP/4)
    );

    check(result);
});

test('Entry hazard KO after Pursuit KO',()=>{
    const d=party(
        p('Gengar','Levitate',{curHP:20}),
        [
            p('Gyarados','Intimidate',{curHP:1}),
            p('Suicune','Pressure')
        ],
        {'Stealth Rock':1}
    );

    const result=predict({
        attacker:attacker(),
        defender:d,
        switchIndex:0,
        damageCalculator:()=>({rolls:[40]})
    });

    const o=result.outcomes[0];

    assert.equal(result.outgoingKOChance,1);
    assert.equal(result.incomingKOChance,1);
    assert.equal(o.enemy.active.currentHP,0);
    assert.equal(o.own.active.boosts.atk,0);

    check(result);
});

test('Weather changes only after interception',()=>{
    const d=party(
        p('Gengar','Levitate'),
        [p('Abomasnow','Snow Warning')]
    );

    let calls=0;

    const result=predict({
        attacker:attacker(),
        defender:d,
        switchIndex:0,
        weather:'sandstorm',
        damageCalculator:input=>{
            calls++;

            assert.equal(input.field.weather,'Sand');

            assert.equal(
                input.defender.species,'Gengar'
            );

            return {rolls:[20]};
        }
    });

    assert.ok(calls>0);
    assert.equal(result.outcomes[0].weather,'hail');

    check(result);
});

test('Invalid switch rejected before damage',()=>{
    let calls=0;

    const input={
        attacker:attacker(),
        defender:defender(),
        switchIndex:0,
        damageCalculator:()=>{
            calls++;
            return {rolls:[20]};
        }
    };

    assert.throws(()=>predict({
        ...input,trapped:true
    }));

    assert.throws(()=>predict({
        ...input,switchIndex:9
    }));

    assert.equal(calls,0);
});

test('Actual damage calculator',()=>{
    const result=predict({
        attacker:attacker(),
        defender:defender(),
        switchIndex:0
    });

    assert.equal(result.outgoingKOChance,1);

    assert.ok(result.outcomes.every(
        o=>o.enemy.active.species==='Gyarados'
    ));

    check(result);
});

test('Input immutability',()=>{
    const a=attacker();
    const d=defender();

    const original=structuredClone({a,d});

    predict({
        attacker:a,
        defender:d,
        switchIndex:0,
        damageCalculator:()=>({rolls:[20]})
    });

    assert.deepEqual({a,d},original);
});

console.log('PURSUIT SWITCH V06 TEST: PASS');