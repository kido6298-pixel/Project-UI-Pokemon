const {evaluateHazards}=require('./hazards');
const {normalizeHazards}=require('./hazard_normalization');

const HAZARDS=new Set([
    'Stealth Rock',
    'Spikes',
    'Toxic Spikes'
]);

function removeHazards(conditions={},names=HAZARDS) {
    const result=structuredClone(conditions);
    const removed=[];

    for (const key of Object.keys(result)) {
        const name=key.replace(/^move:\s*/i,'');

        if (names.has(name)) {
            delete result[key];

            if (!removed.includes(name)) {
                removed.push(name);
            }
        }
    }

    return {
        conditions:result,
        removed,
        changed:removed.length>0
    };
}

function predictRapidSpinRemoval({
    conditions={},
    hit,
    damage,
    actorAlive=true
}) {
    if (typeof hit!=='boolean') {
        throw new Error('Invalid hit result');
    }

    if (!Number.isFinite(damage)||damage<0) {
        throw new Error('Invalid damage');
    }

    if (!hit||damage===0||!actorAlive) {
        return {
            conditions:structuredClone(conditions),
            removed:[],
            changed:false,
            success:false
        };
    }

    return {
        ...removeHazards(conditions),
        success:true
    };
}

function predictToxicSpikesAbsorption({
    candidate,
    conditions={},
    field={}
}) {
    const hazards=evaluateHazards(
        candidate,
        normalizeHazards(conditions),
        field
    );

    if (hazards.currentHP<=0 ||
        hazards.faintedOnEntry ||
        hazards.toxicSpikes!=='absorb') {
        return {
            conditions:structuredClone(conditions),
            removed:[],
            changed:false,
            absorbed:false
        };
    }

    const result=removeHazards(
        conditions,
        new Set(['Toxic Spikes'])
    );

    return {
        ...result,
        absorbed:result.changed
    };
}

module.exports={
    removeHazards,
    predictRapidSpinRemoval,
    predictToxicSpikesAbsorption
};