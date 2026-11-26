const {Dex}=require('pokemon-showdown');

const dex=Dex.mod('gen4');

function predictStatusAction({
    status=null,
    moveName,
    currentHP
}) {
    if (!Number.isSafeInteger(currentHP) ||
        currentHP<0) {
        throw new Error('Invalid HP');
    }

    if (currentHP===0) {
        return {
            supported:true,
            outcomes:[{
                canAct:false,
                status,
                probability:1,
                reason:'fainted'
            }]
        };
    }

    const move=dex.moves.get(moveName);

    if (!move.exists || move.gen>4) {
        throw new Error('Unknown move');
    }

    const outcome=(
        canAct,nextStatus,probability,reason
    )=>({
        canAct,
        status:nextStatus,
        probability,
        reason
    });

    if (status==='par') {
        return {
            supported:true,
            outcomes:[
                outcome(true,'par',0.75,null),
                outcome(
                    false,'par',0.25,
                    'full_paralysis'
                )
            ]
        };
    }

    if (status==='frz') {
        if (move.flags?.defrost) {
            return {
                supported:true,
                outcomes:[
                    outcome(
                        true,null,1,
                        'move_defrost'
                    )
                ]
            };
        }

        return {
            supported:true,
            outcomes:[
                outcome(
                    true,null,0.20,
                    'natural_thaw'
                ),
                outcome(
                    false,'frz',0.80,
                    'frozen'
                )
            ]
        };
    }

    if (status==='slp') {
        return {
            supported:false,
            reason:'sleep_counter_required',
            outcomes:[]
        };
    }

    if (![null,'','brn','psn','tox']
        .includes(status)) {
        return {
            supported:false,
            reason:'unknown_status',
            outcomes:[]
        };
    }

    return {
        supported:true,
        outcomes:[
            outcome(true,status,1,null)
        ]
    };
}

module.exports={predictStatusAction};