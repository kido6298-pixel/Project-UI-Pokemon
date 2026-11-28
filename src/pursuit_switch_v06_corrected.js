const {
    predictPursuitInterception
}=require('./pursuit_interception_v06_corrected');

const {
    predictSwitchPhase,
    enumerateReplacementEntries
}=require('./entry_integration_v06');

const {
    evaluatePartyBoard
}=require('./party_state_v06_ability');

function predictPursuitSwitch({
    attacker,
    defender,
    switchIndex,
    trapped=false,
    weather='none',
    weatherSuppressed=false,
    hazardField={},
    field={},
    damageCalculator
}) {
    if (trapped) {
        throw new Error('Pokemon is trapped');
    }

    if (!Number.isSafeInteger(switchIndex)||
        switchIndex<0||
        switchIndex>=defender.reserves.length) {
        throw new Error('Invalid switch index');
    }

    const candidate=defender.reserves[switchIndex];

    if (candidate.currentHP<=0||candidate.active) {
        throw new Error('Invalid switch candidate');
    }

    const initialValue=evaluatePartyBoard({
        own:attacker,
        enemy:defender,
        hazardField
    }).advantage;

    const interception=predictPursuitInterception({
        attacker:attacker.active,
        defender:defender.active,
        attackerConditions:attacker.conditions,
        defenderConditions:defender.conditions,
        weather,
        weatherSuppressed,
        field,
        damageCalculator
    });

    const outcomes=[];

    for (const hit of interception.outcomes) {
        const a={
            ...structuredClone(attacker),
            active:hit.attacker,
            conditions:hit.attackerConditions
        };

        const b={
            ...structuredClone(defender),
            active:hit.defender,
            conditions:hit.defenderConditions
        };

        let entries;

        if (hit.defenderFainted) {
            const choices=enumerateReplacementEntries({
                own:a,
                enemy:b,
                weather:hit.weather,
                weatherSuppressed,
                hazardField
            });

            const selected=choices.find(
                c=>c.enemyIndex===switchIndex
            );

            if (!selected) {
                throw new Error(
                    'Selected replacement unavailable'
                );
            }

            entries=selected.outcomes;
        } else {
            entries=predictSwitchPhase({
                own:a,
                enemy:b,
                enemyIndex:switchIndex,
                weather:hit.weather,
                weatherSuppressed,
                hazardField
            });
        }

        for (const entry of entries) {
            outcomes.push({
                ...entry,
                pursuitDamage:hit.damage,
                outgoingFainted:hit.defenderFainted,
                outgoingSpecies:defender.active.species,
                incomingSpecies:entry.enemy.active.species,
                selectedIndex:switchIndex,
                incomingFainted:
                    entry.enemy.active.currentHP===0,
                probability:
                    hit.probability*entry.probability
            });
        }
    }

    const result={
        initialValue,
        expectedValue:0,
        expectedDamage:0,
        outgoingKOChance:0,
        incomingKOChance:0,
        probabilitySum:0,
        outcomes
    };

    for (const o of outcomes) {
        result.expectedValue+=o.value*o.probability;

        result.expectedDamage+=
            o.pursuitDamage*o.probability;

        result.outgoingKOChance+=
            Number(o.outgoingFainted)*o.probability;

        result.incomingKOChance+=
            Number(o.incomingFainted)*o.probability;

        result.probabilitySum+=o.probability;
    }

    if (Math.abs(result.probabilitySum-1)>1e-8) {
        throw new Error('Invalid probability sum');
    }

    result.expectedChange=
        result.expectedValue-initialValue;

    return result;
}

module.exports={predictPursuitSwitch};