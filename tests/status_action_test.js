const assert=require('node:assert/strict');

const {
    predictStatusAction
}=require('../src/status_action');

const base={
    currentHP:100,
    moveName:'Surf'
};

function checkProbability(result) {
    assert.ok(Math.abs(
        result.outcomes.reduce(
            (sum,o)=>sum+o.probability,0
        )-1
    )<1e-12);
}

const paralysis=predictStatusAction({
    ...base,status:'par'
});

assert.equal(
    paralysis.outcomes.find(o=>o.canAct)
        .probability,
    0.75
);

assert.equal(
    paralysis.outcomes.find(o=>!o.canAct)
        .probability,
    0.25
);

checkProbability(paralysis);

console.log('Paralysis probability: PASS');

const frozen=predictStatusAction({
    ...base,status:'frz'
});

const thaw=frozen.outcomes.find(
    o=>o.canAct
);

assert.equal(thaw.probability,0.20);
assert.equal(thaw.status,null);

assert.equal(
    frozen.outcomes.find(o=>!o.canAct)
        .probability,
    0.80
);

checkProbability(frozen);

console.log('Freeze and natural thaw: PASS');

const flameWheel=predictStatusAction({
    ...base,
    status:'frz',
    moveName:'Flame Wheel'
});

assert.equal(
    flameWheel.outcomes.length,1
);

assert.equal(
    flameWheel.outcomes[0].canAct,true
);

assert.equal(
    flameWheel.outcomes[0].status,null
);

console.log('Self-defrosting move: PASS');

for (const status of [
    null,'','brn','psn','tox'
]) {
    const result=predictStatusAction({
        ...base,status
    });

    assert.equal(
        result.outcomes[0].canAct,true
    );

    assert.equal(
        result.outcomes[0].probability,1
    );

    checkProbability(result);
}

console.log('Non-blocking statuses: PASS');

const sleep=predictStatusAction({
    ...base,status:'slp'
});

assert.equal(sleep.supported,false);
assert.equal(
    sleep.reason,
    'sleep_counter_required'
);

console.log('Unsupported sleep protection: PASS');

const fainted=predictStatusAction({
    ...base,
    currentHP:0,
    status:'par'
});

assert.equal(
    fainted.outcomes[0].canAct,false
);

assert.equal(
    fainted.outcomes[0].probability,1
);

console.log('Fainted protection: PASS');

assert.throws(
    ()=>predictStatusAction({
        ...base,currentHP:-1
    }),
    /Invalid HP/
);

console.log('Input validation: PASS');

console.log('\n=== ACTION PROBABILITY ===');

console.table(
    [null,'par','frz','brn','psn','tox']
        .map(status=>{
            const result=predictStatusAction({
                ...base,status
            });

            const actionProbability=
                result.outcomes
                    .filter(o=>o.canAct)
                    .reduce(
                        (sum,o)=>
                            sum+o.probability,0
                    );

            return {
                status:status || 'normal',
                actionProbability,
                blockedProbability:
                    1-actionProbability
            };
        })
);

console.log('STATUS ACTION TEST: PASS');