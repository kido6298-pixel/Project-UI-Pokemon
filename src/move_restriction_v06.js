const {Dex}=require('pokemon-showdown');
const dex=Dex.mod('gen4');

function getMove(moveName) {
    const move=dex.moves.get(moveName||'');

    if (!move.exists||move.gen>4) {
        return null;
    }

    return move;
}

function predictMoveRestriction({
    actor,
    target,
    moveName,
    conditions={}
}) {
    const move=getMove(moveName);

    if (!move||
        !['taunt','encore'].includes(move.id)) {
        return {
            supported:false,
            outcomes:[]
        };
    }

    function fail(reason) {
        return {
            supported:true,
            successProbability:0,
            outcomes:[{
                success:false,
                reason,
                target:structuredClone(target),
                probability:1
            }]
        };
    }

    if (actor.currentHP<=0||
        target.currentHP<=0) {
        return fail('fainted');
    }

    if (conditions.protect) {
        return fail('protect');
    }

    const restrictions=target.restrictions??{};

    if (restrictions[move.id]?.remaining>0) {
        return fail('already_active');
    }

    let durations;
    let lockedMove=null;

    if (move.id==='taunt') {
        durations=[3,4,5];
    } else {
        const last=getMove(target.lastMove);

        if (!last) {
            return fail('no_last_move');
        }

        if (last.flags?.failencore) {
            return fail('invalid_last_move');
        }

        if (!Array.isArray(target.moveSlots)) {
            return {
                supported:false,
                reason:'move_slots_required',
                outcomes:[]
            };
        }

        const slot=target.moveSlots.find(
            s=>getMove(s.id??s.move)?.id===last.id
        );

        if (!slot||
            !Number.isFinite(slot.pp)||
            slot.pp<=0) {
            return fail('move_unavailable');
        }

        lockedMove=last.id;
        durations=[4,5,6,7,8];
    }

    const outcomes=durations.map(remaining=>{
        const next=structuredClone(target);

        next.restrictions={
            ...next.restrictions,
            [move.id]:{
                remaining,
                ...(lockedMove
                    ? {move:lockedMove}
                    : {})
            }
        };

        return {
            success:true,
            reason:null,
            target:next,
            probability:1/durations.length
        };
    });

    return {
        supported:true,
        successProbability:1,
        outcomes
    };
}

function resolveRestrictedMove(pokemon,moveName) {
    const selected=getMove(moveName);

    if (!selected) {
        return {
            supported:false,
            canAct:false,
            reason:'unknown_move'
        };
    }

    const restrictions=pokemon.restrictions??{};
    const encore=restrictions.encore;

    let actual=selected;

    if (encore?.remaining>0) {
        actual=getMove(encore.move);

        if (!actual) {
            return {
                supported:false,
                canAct:false,
                reason:'invalid_encore_state'
            };
        }
    }

    if (restrictions.taunt?.remaining>0&&
        actual.category==='Status') {
        return {
            supported:true,
            canAct:false,
            move:actual.id,
            overridden:actual.id!==selected.id,
            reason:'taunt'
        };
    }

    return {
        supported:true,
        canAct:true,
        move:actual.id,
        overridden:actual.id!==selected.id,
        reason:null
    };
}

function tickMoveRestrictions(pokemon) {
    const next=structuredClone(pokemon);

    next.restrictions??={};

    for (const name of ['encore','taunt']) {
        const effect=next.restrictions[name];

        if (!effect) continue;

        if (name==='encore'&&
            Array.isArray(next.moveSlots)) {

            const slot=next.moveSlots.find(
                s=>getMove(s.id??s.move)?.id
                    ===effect.move
            );

            if (!slot||slot.pp<=0) {
                delete next.restrictions[name];
                continue;
            }
        }

        effect.remaining--;

        if (effect.remaining<=0) {
            delete next.restrictions[name];
        }
    }

    return next;
}

function clearMoveRestrictionsOnSwitch(pokemon) {
    const next=structuredClone(pokemon);

    next.restrictions??={};

    delete next.restrictions.taunt;
    delete next.restrictions.encore;

    next.lastMove=null;

    return next;
}

module.exports={
    predictMoveRestriction,
    resolveRestrictedMove,
    tickMoveRestrictions,
    clearMoveRestrictionsOnSwitch
};