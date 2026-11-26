function createSleepState({
    source='normal',
    earlyBird=false
}={}) {
    if (!['normal','rest'].includes(source)) {
        throw new Error('Unknown sleep source');
    }

    const durations=source==='rest'
        ? [2]
        : [1,2,3,4];

    return {
        source,
        earlyBird,
        elapsed:0,
        candidates:durations.map(duration=>({
            remaining:duration,
            probability:1/durations.length
        }))
    };
}

function predictSleepAction(state) {
    if (!state?.candidates?.length) {
        throw new Error('Missing sleep state');
    }

    const decrement=state.earlyBird ? 2 : 1;

    let wakeProbability=0;
    let sleepProbability=0;

    const remaining=new Map();

    for (const candidate of state.candidates) {
        const next=
            candidate.remaining+1-decrement;

        if (next<=0) {
            wakeProbability+=candidate.probability;
        } else {
            sleepProbability+=candidate.probability;

            const count=next-1;

            remaining.set(
                count,
                (remaining.get(count)||0)+
                    candidate.probability
            );
        }
    }

    const outcomes=[];

    if (wakeProbability>0) {
        outcomes.push({
            canAct:true,
            status:null,
            probability:wakeProbability,
            sleepState:null
        });
    }

    if (sleepProbability>0) {
        outcomes.push({
            canAct:false,
            status:'slp',
            probability:sleepProbability,
            sleepState:{
                ...state,
                elapsed:state.elapsed+1,
                candidates:[...remaining].map(
                    ([remaining,probability])=>({
                        remaining,
                        probability:
                            probability/sleepProbability
                    })
                )
            }
        });
    }

    return {
        wakeProbability,
        sleepProbability,
        outcomes
    };
}

function observeContinuedSleep(state) {
    const result=predictSleepAction(state);

    const sleeping=result.outcomes.find(
        outcome=>!outcome.canAct
    );

    if (!sleeping) {
        throw new Error(
            'Sleep observation contradicts model'
        );
    }

    return sleeping.sleepState;
}

module.exports={
    createSleepState,
    predictSleepAction,
    observeContinuedSleep
};