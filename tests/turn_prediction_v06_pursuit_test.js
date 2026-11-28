const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06_ability');

const {
    predictPartyTurnV06:turn
}=require('../src/turn_prediction_v06_pursuit');

const {
    predictPartyTurnV06:previous
}=require('../src/turn_prediction_v06_ability');

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

function defender(extra={}) {
    return party(
        p('Gengar','Levitate',extra),
        [
            p('Gyarados','Intimidate'),
            p('Suicune','Pressure')
        ]
    );
}

const move=name=>({type:'move',move:name});
const sw=(index=0)=>({type:'switch',index});

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function check(result) {
    assert.ok(result.outcomes.length>0);

    assert.ok(
        Math.abs(result.probabilitySum-1)<1e-8
    );
}

test('Own Pursuit intercepts enemy switch',()=>{
    let calls=0;

    const result=turn({
        own:attacker(),
        enemy:defender(),
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        residual:false,
        damageCalculator:input=>{
            calls++;

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

    assert.ok(calls>0);

    const o=result.outcomes[0];

    assert.equal(o.enemy.active.species,'Gyarados');
    assert.equal(o.own.active.boosts.atk,-1);
    assert.equal(o.own.active.moveSlots[0].pp,9);
    assert.equal(o.pursuitEvents[0].side,'own');
    assert.equal(o.pursuitEvents[0].damage,30);

    check(result);
});

test('Enemy Pursuit intercepts own switch',()=>{
    const result=turn({
        own:defender(),
        enemy:attacker(),
        ownAction:sw(),
        enemyAction:move('Pursuit'),
        residual:false,
        damageCalculator:()=>({rolls:[30]})
    });

    const o=result.outcomes[0];

    assert.equal(o.own.active.species,'Gyarados');
    assert.equal(o.enemy.active.boosts.atk,-1);
    assert.equal(o.enemy.active.moveSlots[0].pp,9);
    assert.equal(o.pursuitEvents[0].side,'enemy');
    assert.equal(o.switchEvents[0].side,'own');

    check(result);
});

test('Pursuit KO and selected replacement',()=>{
    const result=turn({
        own:attacker(),
        enemy:defender({curHP:20}),
        ownAction:move('Pursuit'),
        enemyAction:sw(1),
        residual:false,
        damageCalculator:()=>({rolls:[40]})
    });

    const o=result.outcomes[0];

    assert.equal(o.enemy.active.species,'Suicune');
    assert.equal(o.enemy.reserves[1].currentHP,0);

    assert.equal(
        o.pursuitEvents[0].outgoingFainted,true
    );

    check(result);
});

test('Pursuit without switch uses normal damage',()=>{
    let calls=0;

    const result=turn({
        own:attacker(),
        enemy:party(p('Suicune','Pressure')),
        ownAction:move('Pursuit'),
        enemyAction:move('Calm Mind'),
        residual:false,
        damageCalculator:input=>{
            calls++;

            assert.equal(input.move,'Pursuit');

            assert.equal(
                input.field.defenderSide.isSwitching,
                undefined
            );

            return {rolls:[20]};
        }
    });

    assert.ok(calls>0);

    assert.ok(result.outcomes.every(o=>
        o.pursuitEvents.length===0&&
        o.own.active.moveSlots[0].pp===8
    ));

    check(result);
});

test('Paralysis branches preserve switch',()=>{
    const result=turn({
        own:attacker({status:'par'}),
        enemy:defender(),
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        residual:false,
        damageCalculator:()=>({rolls:[40]})
    });

    const blocked=result.outcomes.find(
        o=>o.pursuitEvents[0].damage===0
    );

    assert.equal(blocked.probability,0.25);
    assert.equal(blocked.own.active.moveSlots[0].pp,10);
    assert.equal(blocked.enemy.active.species,'Gyarados');

    check(result);
});

test('End turn residual applied once',()=>{
    const d=defender();

    const result=turn({
        own:attacker(),
        enemy:d,
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        weather:'sandstorm',
        damageCalculator:()=>({rolls:[20]})
    });

    const o=result.outcomes[0];

    assert.equal(
        o.enemy.active.currentHP,
        d.reserves[0].maxHP-
            Math.floor(d.reserves[0].maxHP/16)
    );

    assert.equal(
        o.enemy.reserves[0].currentHP,
        d.active.currentHP-20
    );

    assert.equal(o.own.active.moveSlots[0].pp,9);

    check(result);
});

test('Incoming weather before residual',()=>{
    const a=attacker();

    const result=turn({
        own:a,
        enemy:party(
            p('Gengar','Levitate'),
            [p('Abomasnow','Snow Warning')]
        ),
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        weather:'sandstorm',
        damageCalculator:()=>({rolls:[20]})
    });

    const o=result.outcomes[0];

    assert.equal(o.weather,'hail');

    assert.equal(
        o.own.active.currentHP,
        a.active.maxHP-
            Math.floor(a.active.maxHP/16)
    );

    check(result);
});

test('Actual calculator interception',()=>{
    const result=turn({
        own:attacker(),
        enemy:defender(),
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        residual:false
    });

    assert.ok(result.outcomes.every(o=>
        o.pursuitEvents[0].outgoingFainted&&
        o.enemy.active.species==='Gyarados'
    ));

    check(result);
});

test('Non Pursuit regression',()=>{
    const input={
        own:party(
            p('Suicune','Pressure'),
            [p('Gyarados','Intimidate')]
        ),
        enemy:party(p('Garchomp','Sand Veil')),
        ownAction:sw(),
        enemyAction:move('Dragon Claw'),
        residual:false
    };

    const before=previous(input);
    const after=turn(input);

    for (const o of after.outcomes) {
        assert.deepEqual(o.pursuitEvents,[]);
        delete o.pursuitEvents;
    }

    assert.deepEqual(after,before);
});

test('Input immutability',()=>{
    const own=attacker();
    const enemy=defender();

    const original=structuredClone({own,enemy});

    turn({
        own,enemy,
        ownAction:move('Pursuit'),
        enemyAction:sw(),
        residual:false
    });

    assert.deepEqual({own,enemy},original);
});

console.log('TURN PREDICTION V06 PURSUIT TEST: PASS');