const assert=require('node:assert/strict');

const {
    predictStatusActionV06
}=require('../src/status_action_v06');

const {
    predictStatusSwitchV06
}=require('../src/status_switch_v06');

const {
    createSleepState
}=require('../src/sleep_prediction');

const {
    predictStatusResidual
}=require('../src/status_residual');

const {
    effectiveSpeed
}=require('../src/speed');

const base={
    currentHP:100,
    moveName:'Surf'
};

const normal=predictStatusActionV06({
    ...base,
    status:'par'
});

assert.equal(
    normal.outcomes.find(o=>!o.canAct)
        .probability,
    0.25
);

const magic=predictStatusActionV06({
    ...base,
    status:'par',
    ability:'Magic Guard'
});

assert.equal(magic.outcomes.length,1);
assert.equal(magic.outcomes[0].canAct,true);
assert.equal(magic.outcomes[0].probability,1);
assert.equal(magic.outcomes[0].status,'par');

console.log('Gen 4 Magic Guard: PASS');

const clefable={
    species:'Clefable',
    level:50,
    ability:'Magic Guard'
};

assert.equal(
    effectiveSpeed({...clefable,status:'par'}),
    Math.floor(effectiveSpeed(clefable)/4)
);

console.log('Magic Guard speed penalty: PASS');

const ursaring={
    species:'Ursaring',
    level:50,
    ability:'Quick Feet'
};

assert.equal(
    effectiveSpeed({...ursaring,status:'par'}),
    Math.floor(effectiveSpeed(ursaring)*1.5)
);

const quickFeet=predictStatusActionV06({
    ...base,
    status:'par',
    ability:'Quick Feet'
});

assert.equal(
    quickFeet.outcomes.find(o=>!o.canAct)
        .probability,
    0.25
);

console.log('Quick Feet mechanics: PASS');

let sleepState=createSleepState();

const first=predictStatusActionV06({
    ...base,
    status:'slp',
    sleepState
});

assert.equal(first.supported,true);
assert.equal(first.outcomes.length,1);
assert.equal(first.outcomes[0].canAct,false);

sleepState=first.outcomes[0].sleepState;

const second=predictStatusActionV06({
    ...base,
    status:'slp',
    sleepState
});

assert.equal(
    second.outcomes.find(o=>o.canAct)
        .probability,
    0.25
);

assert.equal(
    second.outcomes.find(o=>o.canAct)
        .status,
    null
);

console.log('Sleep action integration: PASS');

const early=predictStatusActionV06({
    ...base,
    status:'slp',
    ability:'Early Bird',
    sleepState:createSleepState()
});

assert.equal(
    early.outcomes.find(o=>o.canAct)
        .probability,
    0.25
);

console.log('Early Bird integration: PASS');

assert.equal(
    predictStatusActionV06({
        ...base,
        status:'slp'
    }).supported,
    false
);

for (const moveName of [
    'Sleep Talk','Snore'
]) {
    assert.equal(
        predictStatusActionV06({
            ...base,
            status:'slp',
            moveName,
            sleepState:createSleepState()
        }).supported,
        false
    );
}

console.log('Unsupported sleep protection: PASS');

const poisoned={
    currentHP:160,
    maxHP:160,
    status:'tox',
    toxicCounter:5
};

const switched=predictStatusSwitchV06(
    poisoned
);

assert.equal(switched.status,'tox');
assert.equal(switched.toxicCounter,0);
assert.equal(poisoned.toxicCounter,5);

const residual=predictStatusResidual(
    switched
);

assert.equal(residual.damage,10);
assert.equal(residual.toxicCounter,1);

console.log('Toxic switch reset: PASS');

const sleeping={
    currentHP:100,
    maxHP:160,
    status:'slp',
    sleepState
};

assert.deepEqual(
    predictStatusSwitchV06(sleeping),
    sleeping
);

console.log('Sleep preservation on switch: PASS');

const fainted=predictStatusActionV06({
    ...base,
    currentHP:0,
    status:'par',
    ability:'Magic Guard'
});

assert.equal(
    fainted.outcomes[0].canAct,
    false
);

console.log('Fainted protection: PASS');

console.log('STATUS INTEGRATION V06 TEST: PASS');