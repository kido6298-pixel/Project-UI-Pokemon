const assert=require('node:assert/strict');

const {
    createParty
}=require('../src/party_state_v06_ability');

const {
    predictPartyTurnV06:turn,
    weatherOrder,
    weatherField
}=require('../src/turn_prediction_v06_ability');

const {
    predictResolvedDamageV06
}=require('../src/damage_v06_resolved_corrected');

function p(species,ability,extra={}) {
    return {
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    };
}

function party(active,reserves=[],conditions={}) {
    return createParty({active,reserves,conditions});
}

function move(name) {
    return {type:'move',move:name};
}

function sw(index=0) {
    return {type:'switch',index};
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function check(result) {
    assert.ok(Math.abs(result.probabilitySum-1)<1e-8);
    assert.ok(result.outcomes.length>0);
}

test('Intimidate before incoming attack',()=>{
    let calls=0;

    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Gyarados','Intimidate')]
        ),
        enemy:party(p('Garchomp','Sand Veil')),
        ownAction:sw(),
        enemyAction:move('Dragon Claw'),
        residual:false,
        damageCalculator:input=>{
            calls++;
            assert.equal(input.attacker.boosts.atk,-1);
            return {rolls:[30]};
        }
    });

    assert.ok(calls>0);
    assert.equal(
        result.outcomes[0].enemy.active.boosts.atk,-1
    );

    assert.equal(
        result.outcomes[0].own.active.species,'Gyarados'
    );

    check(result);
});

test('Sand Stream before damage calculation',()=>{
    let calls=0;

    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Tyranitar','Sand Stream')]
        ),
        enemy:party(p('Starmie','Natural Cure')),
        ownAction:sw(),
        enemyAction:move('Surf'),
        residual:false,
        damageCalculator:input=>{
            calls++;
            assert.equal(input.field.weather,'Sand');
            return {rolls:[30]};
        }
    });

    assert.ok(calls>0);
    assert.equal(result.outcomes[0].weather,'sandstorm');

    check(result);
});

test('Actual damage calculator with sand',()=>{
    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Tyranitar','Sand Stream')]
        ),
        enemy:party(p('Starmie','Natural Cure')),
        ownAction:sw(),
        enemyAction:move('Surf'),
        residual:false
    });

    const expected=predictResolvedDamageV06({
        attacker:p('Starmie','Natural Cure'),
        defender:p('Tyranitar','Sand Stream'),
        move:'Surf',
        field:{weather:'Sand'}
    });

    const hp=result.outcomes[0].own.active.maxHP;

    assert.ok(
        Math.abs(
            result.expectedOwnHP-(hp-expected.average)
        )<1e-8
    );

    check(result);
});

test('New weather applies to end turn',()=>{
    const enemy=party(p('Starmie','Natural Cure'));

    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Tyranitar','Sand Stream')]
        ),
        enemy,
        ownAction:sw(),
        enemyAction:move('Surf'),
        damageCalculator:()=>({rolls:[20]})
    });

    assert.equal(
        result.expectedEnemyHP,
        enemy.active.maxHP-
            Math.max(1,Math.floor(enemy.active.maxHP/16))
    );

    check(result);
});

test('Double switch weather tie',()=>{
    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Mew','Sand Stream')]
        ),
        enemy:party(
            p('Garchomp','Sand Veil'),
            [p('Mew','Snow Warning')]
        ),
        ownAction:sw(),
        enemyAction:sw(),
        residual:false
    });

    assert.equal(result.outcomes.length,2);

    assert.deepEqual(
        result.outcomes.map(o=>o.weather).sort(),
        ['hail','sandstorm']
    );

    assert.ok(result.outcomes.every(
        o=>o.probability===0.5
    ));

    check(result);
});

test('Forced switch Intimidate',()=>{
    const result=turn({
        own:party(p('Skarmory','Keen Eye')),
        enemy:party(
            p('Suicune','Pressure'),
            [p('Gyarados','Intimidate')]
        ),
        ownAction:move('Whirlwind'),
        enemyAction:move('Calm Mind'),
        residual:false
    });

    assert.ok(result.outcomes.every(o=>
        o.own.active.boosts.atk===-1&&
        o.enemy.active.species==='Gyarados'
    ));

    check(result);
});

test('Forced switch weather before residual',()=>{
    const own=party(p('Suicune','Pressure'));

    const result=turn({
        own,
        enemy:party(
            p('Skarmory','Keen Eye'),
            [p('Tyranitar','Sand Stream')]
        ),
        ownAction:move('Roar'),
        enemyAction:move('Steel Wing'),
        damageCalculator:()=>({rolls:[0]})
    });

    assert.ok(result.outcomes.every(
        o=>o.weather==='sandstorm'
    ));

    assert.equal(
        result.expectedOwnHP,
        own.active.maxHP-
            Math.max(1,Math.floor(own.active.maxHP/16))
    );

    check(result);
});

test('Weather suppression before attack',()=>{
    let calls=0;

    const result=turn({
        own:party(
            p('Suicune','Pressure'),
            [p('Golduck','Cloud Nine')]
        ),
        enemy:party(p('Starmie','Natural Cure')),
        ownAction:sw(),
        enemyAction:move('Surf'),
        weather:'rain',
        residual:false,
        damageCalculator:input=>{
            calls++;
            assert.equal(input.field.weather,undefined);
            return {rolls:[20]};
        }
    });

    assert.ok(calls>0);
    assert.equal(result.outcomes[0].weather,'rain');
    assert.equal(
        result.outcomes[0].effectiveWeather,'none'
    );

    check(result);
});

test('Weather speed and priority',()=>{
    const input={
        attacker:p('Kingdra','Swift Swim'),
        defender:p('Garchomp','Sand Veil')
    };

    assert.equal(
        weatherOrder({...input,weather:'none'}).firstChance,
        0
    );

    assert.equal(
        weatherOrder({...input,weather:'rain'}).firstChance,
        1
    );

    assert.equal(
        weatherOrder({
            ...input,
            weather:'rain',
            defenderPriority:1
        }).firstChance,0
    );
});

test('No repeated entry activation',()=>{
    const result=turn({
        own:party(p('Gyarados','Intimidate')),
        enemy:party(p('Garchomp','Sand Veil')),
        ownAction:move('Dragon Dance'),
        enemyAction:move('Dragon Claw'),
        residual:false,
        damageCalculator:()=>({rolls:[20]})
    });

    assert.ok(result.outcomes.every(
        o=>o.enemy.active.boosts.atk===0&&
            o.abilityEvents.length===0
    ));

    check(result);
});

test('Weather field preserves other settings',()=>{
    const input={
        weather:'Rain',
        defenderSide:{isReflect:true}
    };

    const next=weatherField(input,'sandstorm');

    assert.equal(next.weather,'Sand');
    assert.equal(next.defenderSide.isReflect,true);
    assert.equal(input.weather,'Rain');
});

test('Input immutability',()=>{
    const own=party(
        p('Suicune','Pressure'),
        [p('Gyarados','Intimidate')]
    );

    const enemy=party(p('Garchomp','Sand Veil'));

    const original=structuredClone({own,enemy});

    turn({
        own,enemy,
        ownAction:sw(),
        enemyAction:move('Dragon Claw'),
        residual:false
    });

    assert.deepEqual({own,enemy},original);
});

console.log('TURN PREDICTION V06 ABILITY TEST: PASS');