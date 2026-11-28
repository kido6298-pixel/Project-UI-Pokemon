const assert=require('node:assert/strict');

const {
    createParty,
    createPartyMember
}=require('../src/party_state_v06_ability');

const {
    resolvePartyEntries,
    predictSwitchPhase,
    predictForcedEntry,
    enumerateReplacementEntries
}=require('../src/entry_integration_v06');

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

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

function probability(outcomes) {
    const sum=outcomes.reduce(
        (s,o)=>s+o.probability,0
    );

    assert.ok(Math.abs(sum-1)<1e-8);
}

test('Initial entry abilities',()=>{
    const outcomes=resolvePartyEntries({
        own:party(p('Tyranitar','Sand Stream')),
        enemy:party(p('Abomasnow','Snow Warning'))
    });

    assert.equal(outcomes[0].weather,'hail');
    probability(outcomes);
});

test('Voluntary switch Intimidate',()=>{
    const outcomes=predictSwitchPhase({
        own:party(
            p('Suicune','Pressure'),
            [p('Gyarados','Intimidate')]
        ),
        enemy:party(p('Garchomp','Sand Veil')),
        ownIndex:0
    });

    const o=outcomes[0];

    assert.equal(o.own.active.species,'Gyarados');
    assert.equal(o.enemy.active.boosts.atk,-1);
    assert.equal(o.own.reserves[0].species,'Suicune');

    probability(outcomes);
});

test('Simultaneous switch weather',()=>{
    const outcomes=predictSwitchPhase({
        own:party(
            p('Suicune','Pressure'),
            [p('Tyranitar','Sand Stream')]
        ),
        enemy:party(
            p('Garchomp','Sand Veil'),
            [p('Abomasnow','Snow Warning')]
        ),
        ownIndex:0,
        enemyIndex:0
    });

    assert.equal(outcomes[0].weather,'hail');
    probability(outcomes);
});

test('No switch no duplicate activation',()=>{
    const outcomes=predictSwitchPhase({
        own:party(p('Gyarados','Intimidate')),
        enemy:party(p('Garchomp','Sand Veil'))
    });

    assert.equal(
        outcomes[0].enemy.active.boosts.atk,0
    );

    assert.equal(outcomes[0].abilityEvents.length,0);
});

test('Trace restored on voluntary switch',()=>{
    const own=party(
        p('Porygon2','Intimidate',{
            originalAbility:'Trace'
        }),
        [p('Suicune','Pressure')]
    );

    const outcomes=predictSwitchPhase({
        own,
        enemy:party(p('Garchomp','Sand Veil')),
        ownIndex:0
    });

    assert.equal(
        outcomes[0].own.reserves[0].ability,'Trace'
    );
});

test('Entry hazard KO prevents activation',()=>{
    const outcomes=predictSwitchPhase({
        own:party(
            p('Suicune','Pressure'),
            [p('Gyarados','Intimidate',{curHP:1})],
            {'Stealth Rock':1}
        ),
        enemy:party(p('Garchomp','Sand Veil')),
        ownIndex:0
    });

    const o=outcomes[0];

    assert.equal(o.own.active.currentHP,0);
    assert.equal(o.enemy.active.boosts.atk,0);
});

test('Forced switch Intimidate',()=>{
    const result=predictForcedEntry({
        actor:createPartyMember(
            p('Skarmory','Keen Eye'),true
        ),
        target:createPartyMember(
            p('Suicune','Pressure'),true
        ),
        reserves:[
            createPartyMember(
                p('Gyarados','Intimidate'),false
            )
        ],
        moveName:'Whirlwind'
    });

    const o=result.outcomes[0];

    assert.equal(o.success,true);
    assert.equal(o.active.species,'Gyarados');
    assert.equal(o.actor.boosts.atk,-1);
    assert.equal(o.cancelPendingAction,true);

    probability(result.outcomes);
});

test('Forced switch weather branches',()=>{
    const result=predictForcedEntry({
        actor:createPartyMember(
            p('Skarmory','Keen Eye'),true
        ),
        target:createPartyMember(
            p('Suicune','Pressure'),true
        ),
        reserves:[
            createPartyMember(
                p('Tyranitar','Sand Stream'),false
            ),
            createPartyMember(
                p('Abomasnow','Snow Warning'),false
            )
        ],
        moveName:'Whirlwind'
    });

    assert.deepEqual(
        result.outcomes.map(o=>o.weather).sort(),
        ['hail','sandstorm']
    );

    probability(result.outcomes);
});

test('Replacement activates ability',()=>{
    const choices=enumerateReplacementEntries({
        own:party(
            p('Suicune','Pressure',{curHP:0}),
            [p('Gyarados','Intimidate')]
        ),
        enemy:party(p('Garchomp','Sand Veil'))
    });

    assert.equal(choices.length,1);

    const o=choices[0].outcomes[0];

    assert.equal(o.enemy.active.boosts.atk,-1);
    assert.equal(o.own.active.species,'Gyarados');

    probability(choices[0].outcomes);
});

test('Replacement choices remain independent',()=>{
    const choices=enumerateReplacementEntries({
        own:party(
            p('Suicune','Pressure',{curHP:0}),
            [
                p('Gyarados','Intimidate'),
                p('Tyranitar','Sand Stream')
            ]
        ),
        enemy:party(p('Garchomp','Sand Veil'))
    });

    assert.equal(choices.length,2);

    assert.equal(
        choices[0].outcomes[0].enemy.active.boosts.atk,
        -1
    );

    assert.equal(
        choices[1].outcomes[0].weather,'sandstorm'
    );

    for (const choice of choices) {
        probability(choice.outcomes);
    }
});

test('Input immutability',()=>{
    const own=party(
        p('Suicune','Pressure'),
        [p('Gyarados','Intimidate')]
    );

    const enemy=party(p('Garchomp','Sand Veil'));

    const original=structuredClone({own,enemy});

    predictSwitchPhase({
        own,enemy,ownIndex:0
    });

    assert.deepEqual({own,enemy},original);
});

console.log('ENTRY INTEGRATION V06 TEST: PASS');