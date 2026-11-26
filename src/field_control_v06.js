const {Dex}=require('pokemon-showdown');
const {normalizeBoosts}=require('./boost_value');
const {normalizeHazards}=require('./hazard_normalization');

const dex=Dex.mod('gen4');

const HAZARD_MOVES=Object.freeze({
    stealthrock:{name:'Stealth Rock',maxLayers:1},
    spikes:{name:'Spikes',maxLayers:3},
    toxicspikes:{name:'Toxic Spikes',maxLayers:2}
});

function getFieldControlEffect(moveName) {
    const move=dex.moves.get(moveName);

    if (!move.exists||move.gen>4) {
        return null;
    }

    if (Object.hasOwn(HAZARD_MOVES,move.id)) {
        return {
            move:move.name,
            type:'hazard',
            priority:move.priority,
            ...HAZARD_MOVES[move.id]
        };
    }

    if (move.id==='haze') {
        return {
            move:move.name,
            type:'clear_boosts',
            priority:move.priority
        };
    }

    return null;
}

function predictFieldControl({
    actor,
    target,
    moveName,
    ownConditions={},
    enemyConditions={}
}) {
    const effect=getFieldControlEffect(moveName);

    if (!effect) {
        return {
            supported:false,
            reason:'unsupported_move'
        };
    }

    const result={
        supported:true,
        success:false,
        reason:null,
        effect,
        actor:structuredClone(actor),
        target:structuredClone(target),
        ownConditions:structuredClone(ownConditions),
        enemyConditions:structuredClone(enemyConditions)
    };

    if (actor.currentHP<=0) {
        result.reason='fainted';
        return result;
    }

    if (effect.type==='hazard') {
        const hazards=normalizeHazards(
            enemyConditions
        );

        const previous=hazards[effect.name]||0;

        if (previous>=effect.maxLayers) {
            result.reason='maximum_layers';
            return result;
        }

        for (const key of Object.keys(
            result.enemyConditions
        )) {
            if (key.replace(/^move:\s*/i,'')
                ===effect.name) {
                delete result.enemyConditions[key];
            }
        }

        result.enemyConditions[effect.name]=
            previous+1;

        result.success=true;
    }

    if (effect.type==='clear_boosts') {
        const actorBoosts=normalizeBoosts(
            actor.boosts
        );

        const targetBoosts=normalizeBoosts(
            target.boosts
        );

        result.success=[
            ...Object.values(actorBoosts),
            ...Object.values(targetBoosts)
        ].some(stage=>stage!==0);

        result.actor.boosts=normalizeBoosts();
        result.target.boosts=normalizeBoosts();

        if (result.actor.config) {
            result.actor.config.boosts={
                ...result.actor.boosts
            };
        }

        if (result.target.config) {
            result.target.config.boosts={
                ...result.target.boosts
            };
        }
    }

    if (!result.success&&!result.reason) {
        result.reason='no_state_change';
    }

    return result;
}

module.exports={
    HAZARD_MOVES,
    getFieldControlEffect,
    predictFieldControl
};