const assert=require('node:assert/strict');

const {
    createPartyMember:member
}=require('../src/party_state_v06');

const {
    predictEntryAbility:entry
}=require('../src/entry_ability_v06_corrected');

const {
    prepareResolvedAbility:prepare
}=require('../src/damage_v06_resolved');

const {Pokemon,Move,Field,Generations,calculate}
    =require('@smogon/calc');

const gen=Generations.get(4);

function p(species,ability,extra={}) {
    return member({
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    },true);
}

const porygon=p('Porygon2','Download');

const blocked=entry({
    actor:porygon,
    target:p('Steelix','Rock Head',{
        substitute:true
    })
});

assert.equal(blocked.actor.boosts.atk,0);
assert.equal(blocked.actor.boosts.spa,0);

console.log('Download substitute: PASS');

const allowed=entry({
    actor:porygon,
    target:p('Steelix','Rock Head')
});

assert.equal(allowed.actor.boosts.spa,1);

console.log('Download normal activation: PASS');

const trace=entry({
    actor:p('Porygon2','Trace'),
    target:p('Castform','Forecast')
});

assert.equal(trace.actor.ability,'Trace');

console.log('Trace Dex exclusion: PASS');

const copied=entry({
    actor:p('Porygon2','Trace'),
    target:p('Gyarados','Intimidate')
});

assert.equal(copied.actor.ability,'Intimidate');
assert.equal(copied.target.boosts.atk,-1);

console.log('Trace valid activation: PASS');

function calc(a,b,move) {
    return calculate(
        gen,
        new Pokemon(gen,a.species,a),
        new Pokemon(gen,b.species,b),
        new Move(gen,move),
        new Field()
    ).damage;
}

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

const original=structuredClone(attacker);

const corrected=calc(
    prepare(attacker),
    prepare(defender),
    'Ice Beam'
);

const reference=calc(
    {...attacker,ability:'Pressure'},
    defender,
    'Ice Beam'
);

const duplicate=calc(
    attacker,defender,'Ice Beam'
);

assert.deepEqual(corrected,reference);
assert.notDeepEqual(corrected,duplicate);
assert.deepEqual(attacker,original);

console.log('Download double application prevention: PASS');

const physical={
    species:'Garchomp',
    level:50,
    ability:'Sand Veil',
    boosts:{atk:-1}
};

const intimidator={
    species:'Gyarados',
    level:50,
    ability:'Intimidate',
    abilityOn:true
};

const fixed=calc(
    prepare(physical),
    prepare(intimidator),
    'Dragon Claw'
);

const expected=calc(
    physical,
    {...intimidator,abilityOn:false},
    'Dragon Claw'
);

const double=calc(
    physical,intimidator,'Dragon Claw'
);

assert.deepEqual(fixed,expected);
assert.notDeepEqual(fixed,double);

console.log('Intimidate double application prevention: PASS');

console.table([
    {
        scenario:'Download',
        corrected:JSON.stringify(corrected),
        duplicate:JSON.stringify(duplicate)
    },
    {
        scenario:'Intimidate',
        corrected:JSON.stringify(fixed),
        duplicate:JSON.stringify(double)
    }
]);

console.log('RESOLVED ABILITY V06 TEST: PASS');