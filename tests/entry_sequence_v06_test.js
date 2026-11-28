const assert=require('node:assert/strict');

const {
    createPartyMember:member
}=require('../src/party_state_v06');

const {
    predictEntrySequence:sequence,
    entrySpeed
}=require('../src/entry_sequence_v06');

const {
    predictSwitchOut,
    predictSwitchEntry
}=require('../src/switch_ability_v06');

const {
    predictResolvedDamageV06
}=require('../src/damage_v06_resolved_corrected');

const {
    predictDamage
}=require('../src/damage');

function p(species,ability,extra={}) {
    return member({
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    },true);
}

function test(name,fn) {
    fn();
    console.log(name+': PASS');
}

test('Speed ordered weather activation',()=>{
    const result=sequence({
        own:p('Tyranitar','Sand Stream'),
        enemy:p('Abomasnow','Snow Warning')
    });

    const o=result.outcomes[0];

    assert.deepEqual(o.order,['own','enemy']);
    assert.equal(o.weather,'hail');
    assert.equal(result.probabilitySum,1);
});

test('Equal speed probability branches',()=>{
    // Synthetic abilities isolate ordering mechanics.
    const result=sequence({
        own:p('Mew','Sand Stream'),
        enemy:p('Mew','Snow Warning')
    });

    assert.equal(result.outcomes.length,2);
    assert.equal(result.outcomes[0].probability,0.5);
    assert.equal(result.outcomes[1].probability,0.5);

    assert.deepEqual(
        result.outcomes.map(o=>o.weather).sort(),
        ['hail','sandstorm']
    );

    assert.equal(result.probabilitySum,1);
});

test('Single entrant activation',()=>{
    const result=sequence({
        own:p('Tyranitar','Sand Stream'),
        enemy:p('Abomasnow','Snow Warning'),
        enemyEntering:false
    });

    assert.equal(
        result.outcomes[0].weather,'sandstorm'
    );
});

test('Weather suppression',()=>{
    const result=sequence({
        own:p('Tyranitar','Sand Stream'),
        enemy:p('Golduck','Cloud Nine')
    });

    const o=result.outcomes[0];

    assert.equal(o.weather,'sandstorm');
    assert.equal(o.effectiveWeather,'none');
    assert.equal(o.suppressed,true);
});

test('Weather speed modifier',()=>{
    const kingdra=p('Kingdra','Swift Swim');

    assert.equal(
        entrySpeed(kingdra,'rain'),
        entrySpeed(kingdra,'none')*2
    );
});

test('Intimidate simultaneous activation',()=>{
    const result=sequence({
        own:p('Gyarados','Intimidate'),
        enemy:p('Salamence','Intimidate')
    });

    const o=result.outcomes[0];

    assert.equal(o.own.boosts.atk,-1);
    assert.equal(o.enemy.boosts.atk,-1);
});

test('Fainted entrant does not activate',()=>{
    const result=sequence({
        own:p('Tyranitar','Sand Stream',{curHP:0}),
        enemy:p('Abomasnow','Snow Warning'),
        enemyEntering:false
    });

    assert.equal(result.outcomes[0].weather,'none');
    assert.equal(result.outcomes[0].events.length,0);
});

test('Trace retries against new entrant',()=>{
    const result=sequence({
        own:p('Porygon2','Trace'),
        enemy:p('Gyarados','Intimidate'),
        ownEntering:false,
        enemyEntering:true
    });

    const o=result.outcomes[0];

    assert.equal(o.own.ability,'Intimidate');
    assert.equal(o.enemy.boosts.atk,-1);
    assert.equal(o.own.boosts.atk,-1);
});

test('Trace does not duplicate activation',()=>{
    const result=sequence({
        own:p('Porygon2','Trace'),
        enemy:p('Gyarados','Intimidate')
    });

    for (const o of result.outcomes) {
        assert.equal(o.own.boosts.atk,-1);
        assert.equal(o.enemy.boosts.atk,-1);
    }
});

test('Trace restoration on switch',()=>{
    const result=sequence({
        own:p('Porygon2','Trace'),
        enemy:p('Gyarados','Intimidate')
    });

    const copied=result.outcomes[0].own;
    const outgoing=predictSwitchOut(copied);

    assert.equal(outgoing.ability,'Trace');
    assert.equal(outgoing.config.ability,'Trace');
    assert.equal(outgoing.active,false);
    assert.equal(outgoing.boosts.atk,0);

    const incoming=predictSwitchEntry({
        candidate:outgoing
    });

    assert.equal(incoming.state.ability,'Trace');
});

test('Copied Natural Cure before restoration',()=>{
    const result=sequence({
        own:p('Porygon2','Trace',{status:'par'}),
        enemy:p('Blissey','Natural Cure')
    });

    const outgoing=predictSwitchOut(
        result.outcomes[0].own
    );

    assert.equal(outgoing.status,null);
    assert.equal(outgoing.ability,'Trace');
});

test('Resolved damage API integration',()=>{
    const attacker={
        species:'Porygon2',
        level:50,
        nature:'Modest',
        ability:'Download',
        boosts:{spa:1}
    };

    const defender={
        species:'Steelix',
        level:50,
        ability:'Rock Head'
    };

    const actual=predictResolvedDamageV06({
        attacker,defender,move:'Ice Beam'
    });

    const expected=predictDamage({
        attacker:{...attacker,ability:'Pressure'},
        defender,move:'Ice Beam'
    });

    assert.deepEqual(actual,expected);
    assert.equal(actual.rolls.length,16);
    assert.equal(attacker.ability,'Download');
});

test('Input immutability',()=>{
    const own=p('Porygon2','Trace');
    const enemy=p('Gyarados','Intimidate');

    const original=structuredClone({own,enemy});

    sequence({own,enemy});

    assert.deepEqual({own,enemy},original);
});

console.log('ENTRY SEQUENCE V06 TEST: PASS');