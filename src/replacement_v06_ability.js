const {
    predictSwitchOut,
    predictSwitchEntry
}=require('./switch_ability_v06');

const {
    evaluatePartyBoard
}=require('./party_state_v06_ability');

function getReplacementOptions(party) {
    if (party.active.currentHP>0) {
        return [];
    }

    return party.reserves
        .map((p,index)=>({
            index,
            species:p.species,
            currentHP:p.currentHP,
            maxHP:p.maxHP,
            active:p.active
        }))
        .filter(p=>
            p.currentHP>0 && !p.active
        );
}

function getPartyStatus(party) {
    const alive=[
        party.active,...party.reserves
    ].filter(p=>p.currentHP>0).length;

    return {
        alive,
        defeated:alive===0,
        needsReplacement:
            party.active.currentHP===0 &&
            alive>0,
        options:getReplacementOptions(party)
    };
}

function predictReplacement({
    party,index,field={}
}) {
    const status=getPartyStatus(party);

    if (!status.needsReplacement) {
        throw new Error(
            'Replacement is not required'
        );
    }

    if (!status.options.some(
        p=>p.index===index
    )) {
        throw new Error(
            'Invalid replacement candidate'
        );
    }

    const next=structuredClone(party);

    const outgoing=predictSwitchOut(
        next.active
    );

    const entry=predictSwitchEntry({
        candidate:next.reserves[index],
        conditions:next.conditions,
        field
    });

    next.active=entry.state;
    next.reserves[index]=outgoing;
    next.conditions=entry.conditions;

    return {
        party:next,
        selectedIndex:index,
        species:next.active.species,
        hazards:entry.hazards,
        absorbed:entry.absorbed,
        faintedOnEntry:entry.faintedOnEntry,
        ...getPartyStatus(next)
    };
}

function enumerateReplacements({
    party,field={}
}) {
    const status=getPartyStatus(party);

    return status.options.map(option=>
        predictReplacement({
            party,
            index:option.index,
            field
        })
    );
}

function getBattleStatus({own,enemy}) {
    const a=getPartyStatus(own);
    const b=getPartyStatus(enemy);

    const finished=a.defeated||b.defeated;

    const winner=
        a.defeated && b.defeated
            ? 'DRAW'
            : a.defeated
                ? 'enemy'
                : b.defeated
                    ? 'own'
                    : null;

    return {
        finished,
        winner,
        own:a,
        enemy:b
    };
}

function enumerateReplacementBoards({
    own,enemy,hazardField={}
}) {
    const status=getBattleStatus({
        own,enemy
    });

    if (status.finished) {
        return [];
    }

    if (!status.own.needsReplacement &&
        !status.enemy.needsReplacement) {
        return [];
    }

    const ownChoices=
        status.own.needsReplacement
            ? enumerateReplacements({
                party:own,
                field:hazardField
            })
            : [{
                party:structuredClone(own),
                selectedIndex:null
            }];

    const enemyChoices=
        status.enemy.needsReplacement
            ? enumerateReplacements({
                party:enemy,
                field:hazardField
            })
            : [{
                party:structuredClone(enemy),
                selectedIndex:null
            }];

    const results=[];

    for (const a of ownChoices) {
        for (const b of enemyChoices) {
            const board={
                own:a.party,
                enemy:b.party
            };

            results.push({
                ...board,
                ownIndex:a.selectedIndex,
                enemyIndex:b.selectedIndex,
                ownEntry:a.hazards??null,
                enemyEntry:b.hazards??null,
                value:evaluatePartyBoard({
                    ...board,hazardField
                }).advantage,
                status:getBattleStatus(board)
            });
        }
    }

    return results;
}

module.exports={
    getReplacementOptions,
    getPartyStatus,
    predictReplacement,
    enumerateReplacements,
    getBattleStatus,
    enumerateReplacementBoards
};