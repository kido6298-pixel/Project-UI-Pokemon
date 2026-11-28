const {
    predictEntrySequence
}=require('./entry_sequence_v06');

const {
    predictVoluntarySwitch,
    evaluatePartyBoard
}=require('./party_state_v06_ability');

const {
    enumerateReplacementBoards
}=require('./replacement_v06_ability');

const {
    predictForcedSwitch
}=require('./switch_ability_v06');

function resolvePartyEntries({
    own,enemy,
    ownEntering=true,
    enemyEntering=true,
    weather='none',
    weatherSuppressed=false,
    hazardField={}
}) {
    const sequence=predictEntrySequence({
        own:own.active,
        enemy:enemy.active,
        ownEntering,
        enemyEntering,
        weather,
        weatherSuppressed
    });

    return sequence.outcomes.map(o=>{
        const a=structuredClone(own);
        const b=structuredClone(enemy);

        a.active=o.own;
        b.active=o.enemy;

        return {
            own:a,
            enemy:b,
            weather:o.weather,
            effectiveWeather:o.effectiveWeather,
            weatherSuppressed:o.suppressed,
            entryOrder:o.order,
            abilityEvents:o.events,
            probability:o.probability,
            value:evaluatePartyBoard({
                own:a,enemy:b,hazardField
            }).advantage
        };
    });
}

function predictSwitchPhase({
    own,enemy,
    ownIndex=null,
    enemyIndex=null,
    ownTrapped=false,
    enemyTrapped=false,
    weather='none',
    weatherSuppressed=false,
    hazardField={}
}) {
    let a=structuredClone(own);
    let b=structuredClone(enemy);

    const switchEvents=[];

    if (ownIndex!==null) {
        const result=predictVoluntarySwitch({
            party:a,
            index:ownIndex,
            trapped:ownTrapped,
            field:hazardField
        });

        a=result.party;

        switchEvents.push({
            side:'own',
            species:a.active.species,
            hazards:result.hazards,
            faintedOnEntry:result.faintedOnEntry
        });
    }

    if (enemyIndex!==null) {
        const result=predictVoluntarySwitch({
            party:b,
            index:enemyIndex,
            trapped:enemyTrapped,
            field:hazardField
        });

        b=result.party;

        switchEvents.push({
            side:'enemy',
            species:b.active.species,
            hazards:result.hazards,
            faintedOnEntry:result.faintedOnEntry
        });
    }

    return resolvePartyEntries({
        own:a,enemy:b,
        ownEntering:ownIndex!==null,
        enemyEntering:enemyIndex!==null,
        weather,
        weatherSuppressed,
        hazardField
    }).map(o=>({
        ...o,
        switchEvents:structuredClone(switchEvents)
    }));
}

function predictForcedEntry({
    actor,target,
    reserves=[],
    moveName,
    conditions={},
    field={},
    weather='none',
    weatherSuppressed=false
}) {
    const result=predictForcedSwitch({
        actor,target,reserves,
        moveName,conditions,field
    });

    const outcomes=[];

    for (const o of result.outcomes) {
        if (!o.success) {
            outcomes.push({
                ...o,
                actor:structuredClone(actor),
                weather,
                abilityEvents:[]
            });

            continue;
        }

        const sequence=predictEntrySequence({
            own:actor,
            enemy:o.active,
            ownEntering:false,
            enemyEntering:true,
            weather,
            weatherSuppressed
        });

        for (const branch of sequence.outcomes) {
            outcomes.push({
                ...o,
                actor:branch.own,
                active:branch.enemy,
                weather:branch.weather,
                effectiveWeather:branch.effectiveWeather,
                weatherSuppressed:branch.suppressed,
                abilityEvents:branch.events,
                probability:
                    o.probability*branch.probability
            });
        }
    }

    return {
        ...result,
        outcomes
    };
}

function enumerateReplacementEntries({
    own,enemy,
    weather='none',
    weatherSuppressed=false,
    hazardField={}
}) {
    const boards=enumerateReplacementBoards({
        own,enemy,hazardField
    });

    return boards.map(board=>({
        ownIndex:board.ownIndex,
        enemyIndex:board.enemyIndex,
        ownEntry:board.ownEntry,
        enemyEntry:board.enemyEntry,

        outcomes:resolvePartyEntries({
            own:board.own,
            enemy:board.enemy,
            ownEntering:board.ownIndex!==null,
            enemyEntering:board.enemyIndex!==null,
            weather,
            weatherSuppressed,
            hazardField
        })
    }));
}

module.exports={
    resolvePartyEntries,
    predictSwitchPhase,
    predictForcedEntry,
    enumerateReplacementEntries
};