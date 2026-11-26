const {Dex}=require('pokemon-showdown');

const {
    predictStatusAction
}=require('./status_action');

const {
    predictSleepAction
}=require('./sleep_prediction');

const dex=Dex.mod('gen4');

function predictStatusActionV06(input) {
    const {
        status=null,
        currentHP,
        moveName,
        ability='',
        sleepState=null
    }=input;

    const base=predictStatusAction(input);

    if (currentHP===0) {
        return base;
    }

    const abilityId=String(ability)
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');

    if (status==='par' &&
        abilityId==='magicguard') {

        return {
            supported:true,
            outcomes:[{
                canAct:true,
                status:'par',
                probability:1,
                reason:'magic_guard'
            }]
        };
    }

    if (status==='slp') {
        const move=dex.moves.get(moveName);

        if (['sleeptalk','snore'].includes(move.id)) {
            return {
                supported:false,
                reason:'sleep_move_not_supported',
                outcomes:[]
            };
        }

        if (!sleepState) {
            return base;
        }

        const result=predictSleepAction({
            ...sleepState,
            earlyBird:abilityId==='earlybird'
        });

        return {
            supported:true,
            outcomes:result.outcomes.map(o=>({
                ...o,
                reason:o.canAct
                    ? 'wake_up'
                    : 'asleep'
            }))
        };
    }

    return base;
}

module.exports={predictStatusActionV06};