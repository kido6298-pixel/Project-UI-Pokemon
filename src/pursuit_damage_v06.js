const {
    predictResolvedDamageV06
}=require('./damage_v06_resolved_corrected');

function predictPursuitDamage({
    attacker,
    defender,
    switching=false,
    field={},
    moveOptions={},
    damageCalculator=predictResolvedDamageV06
}) {
    if (typeof switching!=='boolean') {
        throw new Error('Invalid switching state');
    }

    const nextField=structuredClone(field);

    nextField.defenderSide={
        ...nextField.defenderSide
    };

    // Only a voluntary switch activates this mode.
    delete nextField.defenderSide.isSwitching;

    if (switching) {
        nextField.defenderSide.isSwitching='out';
    }

    const result=damageCalculator({
        attacker:structuredClone(attacker),
        defender:structuredClone(defender),
        move:'Pursuit',
        field:nextField,
        moveOptions:structuredClone(moveOptions)
    });

    if (
        !Array.isArray(result.rolls)||
        !result.rolls.length||
        result.rolls.some(
            n=>!Number.isFinite(n)||n<0
        )
    ) {
        throw new Error('Invalid damage distribution');
    }

    return {
        ...result,
        switching,
        nominalBasePower:switching?80:40
    };
}

module.exports={predictPursuitDamage};