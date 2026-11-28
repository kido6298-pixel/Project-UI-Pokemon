const {Dex}=require('pokemon-showdown');
const {evaluateHazards}=require('./hazards_v06');
const {normalizeHazards}=require('./hazard_normalization');
const {normalizeBoosts}=require('./boost_value');

const {
    predictToxicSpikesAbsorption
}=require('./hazard_removal_v06_corrected');

const {
    predictStatusSwitchV06
}=require('./status_switch_v06');

const {
    clearMoveRestrictionsOnSwitch
}=require('./move_restriction_v06');

const dex=Dex.mod('gen4');

function id(value) {
    return String(value??'')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

function toConfig(state) {
    return {
        ...state.config,
        species:state.species,
        ability:state.ability??
            state.config?.ability??'',
        item:state.item??
            state.config?.item??'',
        curHP:state.currentHP,
        status:state.status||'',
        boosts:{...state.boosts},
        toxicCounter:state.toxicCounter??0,
        sleepState:state.sleepState??null
    };
}

function resetSwitchState(state) {
    const next=clearMoveRestrictionsOnSwitch(
        predictStatusSwitchV06(state)
    );

    next.boosts=normalizeBoosts();

    next.volatiles={};
    next.ingrain=false;
    next.substitute=false;

    next.config=toConfig(next);

    return next;
}

function validateState(state) {
    if (!state||
        !state.species||
        !Number.isSafeInteger(state.currentHP)||
        !Number.isSafeInteger(state.maxHP)||
        state.maxHP<=0||
        state.currentHP<0||
        state.currentHP>state.maxHP) {
        throw new Error('Invalid Pokemon state');
    }
}

function predictSwitchOut(state) {
    validateState(state);

    const next=resetSwitchState(state);

    const ability=id(
        next.ability??next.config?.ability
    );

    if (next.currentHP>0&&
        ability==='naturalcure') {
        next.status=null;
        next.sleepState=null;
        next.toxicCounter=0;
    }

    next.active=false;
    next.config=toConfig(next);

    return next;
}

function predictSwitchEntry({
    candidate,
    conditions={},
    field={}
}) {
    validateState(candidate);

    if (candidate.currentHP<=0) {
        throw new Error('Fainted switch candidate');
    }

    const next=resetSwitchState(candidate);

    const config=toConfig(next);

    const hazards=evaluateHazards(
        config,
        normalizeHazards(conditions),
        field
    );

    if (hazards.maxHP!==candidate.maxHP||
        hazards.currentHP!==candidate.currentHP) {
        throw new Error('Switch HP configuration mismatch');
    }

    const absorption=predictToxicSpikesAbsorption({
        candidate:config,
        conditions,
        field
    });

    next.currentHP=hazards.remainingHP;
    next.active=true;
    next.fainted=next.currentHP===0;

    if (!next.fainted&&
        ['psn','tox'].includes(hazards.toxicSpikes)) {
        next.status=hazards.toxicSpikes;
        next.toxicCounter=0;
    }

    const item=id(
        next.item??next.config?.item
    );

    if (!next.fainted&&(
        (item==='lumberry'&&next.status)||
        (item==='chestoberry'&&next.status==='slp')
    )) {
        next.item='';
        next.status=null;
        next.sleepState=null;
        next.toxicCounter=0;
    }

    next.config=toConfig(next);

    return {
        state:next,
        conditions:absorption.conditions,
        hazards,
        absorbed:absorption.absorbed,
        faintedOnEntry:next.fainted
    };
}

function predictForcedSwitch({
    actor,
    target,
    reserves=[],
    moveName,
    conditions={},
    field={}
}) {
    const move=dex.moves.get(moveName);

    if (!move.exists||
        !['roar','whirlwind'].includes(move.id)) {
        return {
            supported:false,
            outcomes:[]
        };
    }

    validateState(actor);
    validateState(target);

    function fail(reason) {
        return {
            supported:true,
            successProbability:0,
            priority:move.priority,
            outcomes:[{
                success:false,
                reason,
                active:structuredClone(target),
                reserves:structuredClone(reserves),
                conditions:structuredClone(conditions),
                probability:1
            }]
        };
    }

    if (actor.currentHP<=0||
        target.currentHP<=0) {
        return fail('fainted');
    }

    const moldBreaker=id(
        actor.ability??actor.config?.ability
    )==='moldbreaker';

    const ability=moldBreaker
        ? ''
        : id(target.ability??target.config?.ability);

    if (ability==='suctioncups') {
        return fail('suction_cups');
    }

    if (move.id==='roar'&&
        ability==='soundproof') {
        return fail('soundproof');
    }

    if (target.ingrain||
        target.volatiles?.ingrain) {
        return fail('ingrain');
    }

    if (conditions.protect) {
        return fail('protect');
    }

    const eligible=[];

    for (let index=0;index<reserves.length;index++) {
        const candidate=reserves[index];

        validateState(candidate);

        if (candidate.currentHP>0&&
            !candidate.fainted&&
            !candidate.active) {
            eligible.push(index);
        }
    }

    if (!eligible.length) {
        return fail('no_reserves');
    }

    const outcomes=eligible.map(index=>{
        const entry=predictSwitchEntry({
            candidate:reserves[index],
            conditions,
            field
        });

        const nextReserves=structuredClone(reserves);

        nextReserves[index]=predictSwitchOut(target);

        return {
            success:true,
            reason:null,
            selectedIndex:index,
            active:entry.state,
            reserves:nextReserves,
            conditions:entry.conditions,
            hazards:entry.hazards,
            absorbed:entry.absorbed,
            faintedOnEntry:entry.faintedOnEntry,
            cancelPendingAction:true,
            probability:1/eligible.length
        };
    });

    return {
        supported:true,
        priority:move.priority,
        successProbability:1,
        outcomes
    };
}

module.exports={
    predictSwitchOut,
    predictSwitchEntry,
    predictForcedSwitch
};