const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06_ability');

const {
    canInterceptPursuit
}=require('../src/pursuit_eligibility_v06');

const {
    predictPartyTurnV06:turn
}=require('../src/turn_prediction_v06_pursuit_corrected');

function party(species,ability,extra={},reserves=[]) {
    return createParty({
        active:{
            species,ability,
            level:50,nature:'Hardy',
            ...extra
        },
        reserves
    });
}

function attacker(status=null) {
    return party('Tyranitar','Sand Stream',{
        status,
        moveSlots:[{id:'pursuit',pp:10}]
    });
}

function defender() {
    return party('Gengar','Levitate',{},[
        {
            species:'Gyarados',
            ability:'Intimidate',
            level:50,nature:'Hardy'
        }
    ]);
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function simulate(status) {
    return turn({
        own:attacker(status),
        enemy:defender(),
        ownAction:{type:'move',move:'Pursuit'},
        enemyAction:{type:'switch',index:0},
        residual:false,
        damageCalculator:input=>{
            if (status==='frz') {
                assert.equal(
                    input.defender.species,'Gyarados'
                );

                assert.notEqual(
                    input.field.defenderSide?.isSwitching,
                    'out'
                );
            } else {
                assert.equal(
                    input.defender.species,'Gengar'
                );

                assert.equal(
                    input.field.defenderSide.isSwitching,
                    'out'
                );
            }

            return {rolls:[40]};
        }
    });
}

test('Paralysis does not block interception',()=>{
    const result=simulate('par');

    assert.ok(result.outcomes.every(o=>
        o.pursuitEvents[0].damage===40 &&
        o.own.active.status==='par' &&
        o.own.active.moveSlots[0].pp===9
    ));

    assert.ok(
        Math.abs(result.probabilitySum-1)<1e-8
    );
});

test('Frozen attacker attacks incoming target if thawed',()=>{
    const result=simulate('frz');

    assert.ok(result.outcomes.every(o=>
        o.pursuitEvents.length===0 &&
        o.enemy.active.species==='Gyarados'
    ));

    const thawed=result.outcomes.filter(
        o=>o.own.active.status!=='frz'
    );

    const probability=thawed.reduce(
        (sum,o)=>sum+o.probability,0
    );

    assert.ok(Math.abs(probability-0.2)<1e-8);

    assert.ok(thawed.every(o=>
        o.own.active.moveSlots[0].pp===9
    ));
});

test('Normal interception unchanged',()=>{
    const result=simulate(null);

    assert.ok(result.outcomes.every(o=>
        o.pursuitEvents[0].damage===40
    ));
});

test('Sleeping attacker cannot intercept',()=>{
    assert.equal(canInterceptPursuit({
        currentHP:100,status:'slp'
    }),false);
});

test('Truant prevents interception',()=>{
    assert.equal(canInterceptPursuit({
        currentHP:100,
        ability:'Truant',
        volatiles:{truant:true}
    }),false);
});

test('Fainted attacker cannot intercept',()=>{
    assert.equal(canInterceptPursuit({
        currentHP:0
    }),false);
});

console.log('PURSUIT CORRECTED V06 TEST: PASS');