const assert=require('node:assert/strict');

const {
    getFieldControlEffect,
    predictFieldControl:predict
}=require('../src/field_control_v06');

const actor={
    species:'Skarmory',
    currentHP:100,
    maxHP:150,
    boosts:{def:2}
};

const target={
    species:'Suicune',
    currentHP:150,
    maxHP:200,
    boosts:{spa:3,spd:3}
};

const base={
    actor,
    target,
    ownConditions:{},
    enemyConditions:{}
};

function run(moveName,changes={}) {
    return predict({
        ...base,
        ...changes,
        moveName
    });
}

const rock=run('Stealth Rock');

assert.equal(rock.success,true);
assert.equal(
    rock.enemyConditions['Stealth Rock'],1
);
assert.deepEqual(rock.ownConditions,{});

const rockAgain=run('Stealth Rock',{
    enemyConditions:rock.enemyConditions
});

assert.equal(rockAgain.success,false);
assert.equal(
    rockAgain.reason,'maximum_layers'
);

console.log('Stealth Rock: PASS');

let spikes={};

for (let i=1;i<=3;i++) {
    const result=run('Spikes',{
        enemyConditions:spikes
    });

    assert.equal(result.success,true);
    assert.equal(result.enemyConditions.Spikes,i);

    spikes=result.enemyConditions;
}

const fullSpikes=run('Spikes',{
    enemyConditions:spikes
});

assert.equal(fullSpikes.success,false);
assert.equal(fullSpikes.enemyConditions.Spikes,3);

console.log('Spikes layers: PASS');

const toxic1=run('Toxic Spikes');

const toxic2=run('Toxic Spikes',{
    enemyConditions:toxic1.enemyConditions
});

const toxic3=run('Toxic Spikes',{
    enemyConditions:toxic2.enemyConditions
});

assert.equal(
    toxic1.enemyConditions['Toxic Spikes'],1
);

assert.equal(
    toxic2.enemyConditions['Toxic Spikes'],2
);

assert.equal(toxic3.success,false);

console.log('Toxic Spikes layers: PASS');

const mixed=run('Spikes',{
    ownConditions:{
        'Stealth Rock':1
    },
    enemyConditions:{
        'move: Spikes':{layers:1},
        'Stealth Rock':1,
        'Reflect':1
    }
});

assert.deepEqual(
    mixed.enemyConditions,{
        'Stealth Rock':1,
        'Reflect':1,
        'Spikes':2
    }
);

assert.deepEqual(
    mixed.ownConditions,{
        'Stealth Rock':1
    }
);

console.log('Side isolation and condition preservation: PASS');

const haze=run('Haze');

assert.equal(haze.success,true);

assert.ok(
    Object.values(haze.actor.boosts)
        .every(x=>x===0)
);

assert.ok(
    Object.values(haze.target.boosts)
        .every(x=>x===0)
);

assert.equal(haze.actor.currentHP,100);
assert.equal(haze.target.currentHP,150);

console.log('Haze against Calm Mind: PASS');

const negative=run('Haze',{
    actor:{
        ...actor,
        boosts:{atk:-3,def:-2}
    },
    target:{
        ...target,
        boosts:{accuracy:-2,evasion:4}
    }
});

assert.ok(
    Object.values(negative.actor.boosts)
        .every(x=>x===0)
);

assert.ok(
    Object.values(negative.target.boosts)
        .every(x=>x===0)
);

console.log('Negative and positive boost reset: PASS');

const neutral=run('Haze',{
    actor:{...actor,boosts:{}},
    target:{...target,boosts:{}}
});

assert.equal(neutral.success,false);
assert.equal(neutral.reason,'no_state_change');

const preserved=run('Haze',{
    enemyConditions:{Spikes:3},
    target:{
        ...target,
        status:'tox',
        toxicCounter:3
    }
});

assert.equal(preserved.target.status,'tox');
assert.equal(preserved.target.toxicCounter,3);
assert.equal(preserved.enemyConditions.Spikes,3);

console.log('Unrelated state preservation: PASS');

const fainted=run('Stealth Rock',{
    actor:{...actor,currentHP:0}
});

assert.equal(fainted.success,false);
assert.equal(fainted.reason,'fainted');

assert.equal(
    run('Surf').supported,false
);

assert.equal(
    getFieldControlEffect('Unknown Move'),
    null
);

assert.equal(actor.boosts.def,2);
assert.equal(target.boosts.spa,3);
assert.deepEqual(base.enemyConditions,{});

console.log('Unsupported moves and input protection: PASS');

console.log('\n=== FIELD CONTROL RESULTS ===');

console.table([
    {
        move:'Stealth Rock',
        layers:rock.enemyConditions['Stealth Rock']
    },
    {
        move:'Spikes',
        layers:spikes.Spikes
    },
    {
        move:'Toxic Spikes',
        layers:toxic2.enemyConditions['Toxic Spikes']
    }
]);

console.table([
    {
        stat:'Special Attack',
        before:target.boosts.spa,
        after:haze.target.boosts.spa
    },
    {
        stat:'Special Defense',
        before:target.boosts.spd,
        after:haze.target.boosts.spd
    }
]);

console.log('FIELD CONTROL V06 TEST: PASS');