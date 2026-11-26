const assert=require('node:assert/strict');

const {
    predictEndTurnV06:predict
}=require('../src/end_turn_v06');

const base={
    species:'Suicune',
    currentHP:100,
    maxHP:160,
    ability:'Pressure',
    status:null,
    item:''
};

function run(changes={},options={}) {
    return predict({
        ...base,...changes
    },options);
}

function state(changes={},options={}) {
    return run(changes,options)
        .outcomes[0].state;
}

assert.equal(
    state({item:'Leftovers'}).currentHP,110
);

assert.equal(
    state({
        currentHP:155,
        item:'Leftovers'
    }).currentHP,160
);

assert.equal(
    state({
        species:'Gengar',
        item:'Black Sludge'
    }).currentHP,110
);

assert.equal(
    state({
        item:'Black Sludge'
    }).currentHP,80
);

console.log('Held item recovery: PASS');

assert.equal(
    state({},{
        weather:'sandstorm'
    }).currentHP,90
);

assert.equal(
    state({
        species:'Garchomp'
    },{
        weather:'sandstorm'
    }).currentHP,100
);

assert.equal(
    state({
        ability:'Sand Veil'
    },{
        weather:'sandstorm'
    }).currentHP,100
);

assert.equal(
    state({
        species:'Glaceon'
    },{
        weather:'hail'
    }).currentHP,100
);

assert.equal(
    state({
        ability:'Snow Cloak'
    },{
        weather:'hail'
    }).currentHP,100
);

console.log('Weather damage and immunity: PASS');

assert.equal(
    state({
        ability:'Ice Body'
    },{
        weather:'hail'
    }).currentHP,110
);

assert.equal(
    state({
        ability:'Rain Dish'
    },{
        weather:'rain'
    }).currentHP,110
);

assert.equal(
    state({
        ability:'Dry Skin'
    },{
        weather:'rain'
    }).currentHP,120
);

assert.equal(
    state({
        ability:'Dry Skin'
    },{
        weather:'sun'
    }).currentHP,80
);

assert.equal(
    state({
        ability:'Cloud Nine'
    },{
        weather:'sandstorm'
    }).currentHP,100
);

assert.equal(
    state({},{
        weather:'hail',
        weatherSuppressed:true
    }).currentHP,100
);

console.log('Weather abilities: PASS');

assert.equal(
    state({
        ability:'Magic Guard',
        status:'brn',
        item:'Black Sludge'
    },{
        weather:'sandstorm'
    }).currentHP,100
);

assert.equal(
    state({
        ability:'Poison Heal',
        status:'tox'
    }).currentHP,120
);

assert.equal(
    state({
        ability:'Heatproof',
        status:'brn'
    }).currentHP,90
);

console.log('Residual abilities: PASS');

const toxic=state({
    maxHP:175,
    status:'tox',
    toxicCounter:2
});

assert.equal(toxic.currentHP,70);
assert.equal(toxic.toxicCounter,3);

console.log('Gen IV toxic rounding: PASS');

const orb=state({
    item:'Toxic Orb'
});

assert.equal(orb.currentHP,100);
assert.equal(orb.status,'tox');
assert.equal(orb.toxicCounter,0);

const orbNext=predict(orb).outcomes[0].state;

assert.equal(orbNext.currentHP,90);
assert.equal(orbNext.toxicCounter,1);

assert.equal(
    state({
        species:'Metagross',
        item:'Toxic Orb'
    }).status,null
);

assert.equal(
    state({
        species:'Heatran',
        item:'Flame Orb'
    }).status,null
);

assert.equal(
    state({
        item:'Flame Orb'
    }).status,'brn'
);

assert.equal(
    state({
        ability:'Leaf Guard',
        item:'Toxic Orb'
    },{
        weather:'sun'
    }).status,null
);

console.log('Orb timing and immunity: PASS');

const lum=state({
    item:'Lum Berry',
    status:'tox',
    toxicCounter:4
});

assert.equal(lum.status,null);
assert.equal(lum.item,'');
assert.equal(lum.toxicCounter,0);
assert.equal(lum.currentHP,100);

const chesto=state({
    item:'Chesto Berry',
    status:'slp',
    sleepState:{elapsed:1}
});

assert.equal(chesto.status,null);
assert.equal(chesto.sleepState,null);
assert.equal(chesto.item,'');

assert.equal(
    state({
        item:'Chesto Berry',
        status:'brn'
    }).item,'Chesto Berry'
);

assert.equal(
    state({
        ability:'Hydration',
        status:'tox',
        toxicCounter:5
    },{
        weather:'rain'
    }).status,null
);

console.log('Status recovery: PASS');

const shed=run({
    ability:'Shed Skin',
    status:'brn'
});

assert.equal(shed.outcomes.length,2);

assert.equal(
    shed.outcomes[0].probability,0.33
);

assert.equal(
    shed.outcomes[0].state.currentHP,100
);

assert.equal(
    shed.outcomes[1].state.currentHP,80
);

assert.ok(
    Math.abs(shed.expectedHP-86.6)<1e-8
);

assert.ok(
    Math.abs(shed.probabilitySum-1)<1e-8
);

console.log('Shed Skin branching: PASS');

const weatherKO=state({
    currentHP:5,
    item:'Leftovers'
},{
    weather:'sandstorm'
});

assert.equal(weatherKO.currentHP,0);
assert.equal(weatherKO.fainted,true);

const healBeforePoison=state({
    currentHP:15,
    item:'Leftovers',
    status:'psn'
});

assert.equal(healBeforePoison.currentHP,5);

console.log('Residual ordering: PASS');

assert.equal(base.currentHP,100);
assert.equal(base.status,null);

assert.throws(
    ()=>run({currentHP:-1}),
    /Invalid HP/
);

console.log('Input protection: PASS');

console.log('\n=== END TURN RESULTS ===');

console.table([
    ['Leftovers',run({item:'Leftovers'})],
    ['Sand + Leftovers',run({
        item:'Leftovers'
    },{weather:'sandstorm'})],
    ['Toxic Orb first',run({
        item:'Toxic Orb'
    })],
    ['Poison Heal',run({
        ability:'Poison Heal',
        status:'tox'
    })],
    ['Shed Skin',shed],
    ['Weather KO',run({
        currentHP:5,
        item:'Leftovers'
    },{weather:'sandstorm'})]
].map(([scenario,r])=>({
    scenario,
    expectedHP:r.expectedHP,
    koChance:r.koChance,
    outcomes:r.outcomes.length,
    probability:r.probabilitySum
})));

console.log('END TURN V06 TEST: PASS');