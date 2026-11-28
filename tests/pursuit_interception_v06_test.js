const assert=require('node:assert/strict');

const {
    createPartyMember
}=require('../src/party_state_v06_ability');

const {
    predictPursuitInterception:intercept
}=require('../src/pursuit_interception_v06');

function p(species,ability,extra={}) {
    return createPartyMember({
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    },true);
}

function attacker(extra={}) {
    return p('Tyranitar','Sand Stream',{
        moveSlots:[
            {id:'pursuit',pp:10}
        ],
        ...extra
    });
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function check(result) {
    assert.ok(
        Math.abs(result.probabilitySum-1)<1e-8
    );
}

test('Attack outgoing Pokemon',()=>{
    const result=intercept({
        attacker:attacker(),
        defender:p('Gengar','Levitate'),
        damageCalculator:input=>{
            assert.equal(
                input.defender.species,'Gengar'
            );

            assert.equal(
                input.field.defenderSide.isSwitching,
                'out'
            );

            return {rolls:[30]};
        }
    });

    assert.equal(result.expectedDamage,30);
    assert.equal(result.koChance,0);

    const o=result.outcomes[0];

    assert.equal(o.attacker.moveSlots[0].pp,9);
    assert.equal(o.attacker.lastMove,'pursuit');

    check(result);
});

test('KO before switch',()=>{
    const result=intercept({
        attacker:attacker(),
        defender:p('Gengar','Levitate',{
            curHP:20
        }),
        damageCalculator:()=>({rolls:[40]})
    });

    assert.equal(result.koChance,1);
    assert.equal(result.expectedDamage,20);
    assert.equal(
        result.outcomes[0].defender.currentHP,0
    );

    check(result);
});

test('Damage roll KO probability',()=>{
    const result=intercept({
        attacker:attacker(),
        defender:p('Gengar','Levitate',{
            curHP:40
        }),
        damageCalculator:()=>({rolls:[20,60]})
    });

    assert.equal(result.koChance,0.5);
    assert.equal(result.expectedDamage,30);

    check(result);
});

test('Pressure PP consumption',()=>{
    const result=intercept({
        attacker:attacker(),
        defender:p('Suicune','Pressure'),
        damageCalculator:()=>({rolls:[20]})
    });

    assert.equal(
        result.outcomes[0].attacker.moveSlots[0].pp,
        8
    );

    check(result);
});

test('Paralysis action branches',()=>{
    const result=intercept({
        attacker:attacker({status:'par'}),
        defender:p('Gengar','Levitate'),
        damageCalculator:()=>({rolls:[40]})
    });

    assert.equal(result.expectedDamage,30);

    const blocked=result.outcomes.find(
        o=>o.damage===0
    );

    assert.equal(blocked.probability,0.25);
    assert.equal(
        blocked.attacker.moveSlots[0].pp,10
    );

    const success=result.outcomes.find(
        o=>o.damage===40
    );

    assert.equal(success.probability,0.75);
    assert.equal(
        success.attacker.moveSlots[0].pp,9
    );

    check(result);
});

test('Freeze action branches',()=>{
    const result=intercept({
        attacker:attacker({status:'frz'}),
        defender:p('Gengar','Levitate'),
        damageCalculator:()=>({rolls:[40]})
    });

    assert.ok(
        Math.abs(result.expectedDamage-8)<1e-8
    );

    const blocked=result.outcomes.find(
        o=>o.damage===0
    );

    assert.equal(
        blocked.attacker.moveSlots[0].pp,10
    );

    check(result);
});

test('Actual damage calculator',()=>{
    const result=intercept({
        attacker:attacker(),
        defender:p('Gengar','Levitate')
    });

    assert.equal(result.koChance,1);

    check(result);
});

test('Reflect and weather preserved',()=>{
    let calls=0;

    const result=intercept({
        attacker:attacker(),
        defender:p('Suicune','Pressure'),
        defenderConditions:{Reflect:3},
        weather:'sandstorm',
        damageCalculator:input=>{
            calls++;

            assert.equal(
                input.field.weather,'Sand'
            );

            assert.equal(
                input.field.defenderSide.isReflect,
                true
            );

            assert.equal(
                input.field.defenderSide.isSwitching,
                'out'
            );

            return {rolls:[20]};
        }
    });

    assert.ok(calls>0);

    check(result);
});

test('No residual damage during interception',()=>{
    const result=intercept({
        attacker:attacker({status:'brn'}),
        defender:p('Suicune','Pressure'),
        weather:'sandstorm',
        damageCalculator:()=>({rolls:[20]})
    });

    const o=result.outcomes[0];

    assert.equal(
        o.attacker.currentHP,o.attacker.maxHP
    );

    assert.equal(
        o.defender.currentHP,o.defender.maxHP-20
    );

    check(result);
});

test('Input immutability',()=>{
    const a=attacker();
    const b=p('Gengar','Levitate');

    const original=structuredClone({a,b});

    intercept({
        attacker:a,
        defender:b,
        damageCalculator:()=>({rolls:[20]})
    });

    assert.deepEqual({a,b},original);
});

console.log('PURSUIT INTERCEPTION V06 TEST: PASS');