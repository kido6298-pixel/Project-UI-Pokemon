const assert=require('node:assert/strict');

const {
    createPartyMember:member
}=require('../src/party_state_v06');

const {
    predictEntryAbility:entry,
    getEffectiveWeather,
    restoreOriginalAbility
}=require('../src/entry_ability_v06');

function p(species,ability,extra={}) {
    return member({
        species,ability,
        level:50,nature:'Hardy',
        ...extra
    },true);
}

const gyara=p('Gyarados','Intimidate');
const garchomp=p('Garchomp','Sand Veil');
const original=structuredClone(garchomp);

const intimidate=entry({
    actor:gyara,target:garchomp
});

assert.equal(intimidate.target.boosts.atk,-1);
assert.equal(
    intimidate.target.config.boosts.atk,-1
);

console.log('Intimidate and config sync: PASS');

for (const ability of [
    'Clear Body',
    'White Smoke',
    'Hyper Cutter'
]) {
    const result=entry({
        actor:gyara,
        target:p('Metagross',ability)
    });

    assert.equal(result.target.boosts.atk,0);
    assert.equal(result.events[0].blocked,true);
}

console.log('Intimidate immunity: PASS');

const substitute=entry({
    actor:gyara,
    target:p('Garchomp','Sand Veil',{
        substitute:true
    })
});

assert.equal(substitute.target.boosts.atk,0);

const capped=entry({
    actor:gyara,
    target:p('Garchomp','Sand Veil',{
        boosts:{atk:-6}
    })
});

assert.equal(capped.target.boosts.atk,-6);

console.log('Substitute and boost limits: PASS');

const weatherCases=[
    ['Tyranitar','Sand Stream','sandstorm'],
    ['Abomasnow','Snow Warning','hail'],
    ['Kyogre','Drizzle','rain'],
    ['Groudon','Drought','sun']
];

for (const [species,ability,weather]
    of weatherCases) {

    const result=entry({
        actor:p(species,ability),
        target:garchomp
    });

    assert.equal(result.weather,weather);
    assert.equal(result.effectiveWeather,weather);
}

console.log('Weather abilities: PASS');

const overwrite=entry({
    actor:p('Abomasnow','Snow Warning'),
    target:garchomp,
    weather:'sandstorm'
});

assert.equal(overwrite.weather,'hail');

console.log('Weather replacement: PASS');

const suppressed=entry({
    actor:p('Tyranitar','Sand Stream'),
    target:p('Golduck','Cloud Nine')
});

assert.equal(suppressed.weather,'sandstorm');
assert.equal(suppressed.effectiveWeather,'none');
assert.equal(suppressed.suppressed,true);

const restored=getEffectiveWeather({
    own:p('Tyranitar','Sand Stream'),
    enemy:garchomp,
    weather:suppressed.weather
});

assert.equal(
    restored.effectiveWeather,'sandstorm'
);

console.log('Weather suppression and restoration: PASS');

const porygon=p('Porygon2','Download');

const physical=entry({
    actor:porygon,
    target:p('Blissey','Natural Cure')
});

assert.equal(physical.actor.boosts.atk,1);
assert.equal(physical.actor.boosts.spa,0);

const special=entry({
    actor:porygon,
    target:p('Steelix','Rock Head')
});

assert.equal(special.actor.boosts.spa,1);

const tie=entry({
    actor:porygon,
    target:p('Mew','Synchronize')
});

assert.equal(tie.actor.boosts.spa,1);

console.log('Download stat selection: PASS');

const tracer=p('Porygon2','Trace');

const traced=entry({
    actor:tracer,target:gyara
});

assert.equal(traced.actor.ability,'Intimidate');
assert.equal(traced.actor.originalAbility,'Trace');
assert.equal(traced.target.boosts.atk,-1);

console.log('Trace and copied activation: PASS');

const reset=restoreOriginalAbility(
    traced.actor
);

assert.equal(reset.ability,'Trace');
assert.equal(reset.config.ability,'Trace');
assert.equal(reset.originalAbility,undefined);

console.log('Trace restoration: PASS');

const traceWeather=entry({
    actor:tracer,
    target:p('Tyranitar','Sand Stream')
});

assert.equal(traceWeather.weather,'sandstorm');

console.log('Trace weather activation: PASS');

const invalidTrace=entry({
    actor:tracer,
    target:p('Porygon2','Trace')
});

assert.equal(invalidTrace.actor.ability,'Trace');
assert.equal(
    invalidTrace.events[0].success,false
);

console.log('Trace exclusions: PASS');

const fainted=entry({
    actor:p('Tyranitar','Sand Stream',{
        curHP:0
    }),
    target:garchomp
});

assert.equal(fainted.weather,'none');
assert.equal(fainted.events.length,0);

console.log('Entry KO prevents activation: PASS');

assert.deepEqual(garchomp,original);
assert.equal(gyara.boosts.atk,0);
assert.equal(tracer.ability,'Trace');

console.log('Input protection: PASS');

console.table([
    {
        scenario:'Intimidate',
        result:intimidate.target.boosts.atk
    },
    {
        scenario:'Download physical',
        result:physical.actor.boosts.atk
    },
    {
        scenario:'Download special',
        result:special.actor.boosts.spa
    },
    {
        scenario:'Trace',
        result:traced.actor.ability
    },
    {
        scenario:'Weather suppression',
        result:suppressed.effectiveWeather
    }
]);

console.log('ENTRY ABILITY V06 TEST: PASS');