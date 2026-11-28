const base=require('./switch_control_v06_corrected');

const {
    restoreOriginalAbility
}=require('./entry_ability_v06_corrected');

function predictSwitchOut(state) {
    // Apply switch-out effects before restoring Trace.
    const outgoing=base.predictSwitchOut(state);

    return restoreOriginalAbility(outgoing);
}

function predictSwitchEntry(options) {
    return base.predictSwitchEntry({
        ...options,
        candidate:restoreOriginalAbility(
            options.candidate
        )
    });
}

function predictForcedSwitch(options) {
    const result=base.predictForcedSwitch(options);

    return {
        ...result,
        outcomes:result.outcomes.map(outcome=>{
            if (!outcome.success) return outcome;

            const reserves=structuredClone(
                outcome.reserves
            );

            reserves[outcome.selectedIndex]=
                restoreOriginalAbility(
                    reserves[outcome.selectedIndex]
                );

            return {
                ...outcome,
                reserves
            };
        })
    };
}

module.exports={
    predictSwitchOut,
    predictSwitchEntry,
    predictForcedSwitch
};