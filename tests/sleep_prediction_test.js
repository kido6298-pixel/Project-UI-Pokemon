const assert=require('node:assert/strict');

const {
    createSleepState,
    predictSleepAction,
    observeContinuedSleep
}=require('../src/sleep_prediction');

const close=(a,b)=>{
    assert.ok(Math.abs(a-b)<1e-12);
};

let state=createSleepState();

const expected=[
    0,
    1/4,
    1/3,
    1/2,
    1
];

const history=[];

for (let i=0;i<expected.length;i++) {
    const result=predictSleepAction(state);

    close(
        result.wakeProbability,
        expected[i]
    );

    close(
        result.wakeProbability+
        result.sleepProbability,
        1
    );

    history.push({
        previousBlockedActions:i,
        wakeProbability:Number(
            result.wakeProbability.toFixed(4)
        ),
        sleepProbability:Number(
            result.sleepProbability.toFixed(4)
        )
    });

    if (result.sleepProbability>0) {
        state=observeContinuedSleep(state);

        close(
            state.candidates.reduce(
                (sum,c)=>sum+c.probability,0
            ),
            1
        );
    }
}

console.log('Normal sleep progression: PASS');

let rest=createSleepState({
    source:'rest'
});

for (let i=0;i<2;i++) {
    const result=predictSleepAction(rest);

    close(result.wakeProbability,0);

    rest=observeContinuedSleep(rest);
}

close(
    predictSleepAction(rest).wakeProbability,
    1
);

console.log('Rest sleep progression: PASS');

let early=createSleepState({
    earlyBird:true
});

close(
    predictSleepAction(early).wakeProbability,
    1/4
);

early=observeContinuedSleep(early);

close(
    predictSleepAction(early).wakeProbability,
    2/3
);

early=observeContinuedSleep(early);

close(
    predictSleepAction(early).wakeProbability,
    1
);

console.log('Early Bird progression: PASS');

const original=createSleepState();
const snapshot=structuredClone(original);

predictSleepAction(original);

assert.deepEqual(original,snapshot);

console.log('Input protection: PASS');

assert.throws(
    ()=>observeContinuedSleep(rest),
    /contradicts model/
);

console.log('Contradictory observation protection: PASS');

console.log('\n=== SLEEP PROBABILITY ===');
console.table(history);

console.log('SLEEP PREDICTION TEST: PASS');