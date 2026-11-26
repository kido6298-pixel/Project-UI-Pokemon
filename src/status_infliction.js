const {Dex}=require('pokemon-showdown');

const {
    createSleepState
}=require('./sleep_prediction');

const dex=Dex.mod('gen4');

const SUPPORTED_MOVES=Object.freeze({
    willowisp:'brn',
    thunderwave:'par',
    toxic:'tox',
    hypnosis:'slp',
    spore:'slp',
    sleeppowder:'slp',
    stunspore:'par',
    poisonpowder:'psn'
});

function id(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

function predictStatusInfliction({
    moveName,
    attacker={},
    target,
    conditions={}
}) {
    const move=dex.moves.get(moveName);
    const status=SUPPORTED_MOVES[move.id];

    if (!status || !move.exists || move.gen>4) {
        return {
            supported:false,
            reason:'unsupported_move',
            outcomes:[]
        };
    }

    if (!Number.isSafeInteger(target.currentHP) ||
        target.currentHP<0) {
        throw new Error('Invalid target HP');
    }

    const types=target.types ??
        dex.species.get(target.species).types;

    if (!types?.length) {
        throw new Error('Missing target types');
    }

    const attackerAbility=id(
        attacker.ability ??
        attacker.config?.ability
    );

    const targetAbility=id(
        target.ability ??
        target.config?.ability
    );

    const ability=attackerAbility==='moldbreaker'
        ? '' : targetAbility;

    function blocked(reason) {
        return {
            supported:true,
            move:move.name,
            status,
            successProbability:0,
            outcomes:[{
                success:false,
                reason,
                probability:1,
                target:structuredClone(target)
            }]
        };
    }

    if (target.currentHP===0) {
        return blocked('fainted');
    }

    if (target.status) {
        return blocked('existing_status');
    }

    if (conditions.protect) {
        return blocked('protect');
    }

    if (conditions.substitute) {
        return blocked('substitute');
    }

    if (conditions.safeguard) {
        return blocked('safeguard');
    }

    if (status==='brn') {
        if (types.includes('Fire')) {
            return blocked('fire_type');
        }

        if (ability==='waterveil' ||
            ability==='flashfire') {
            return blocked('ability_immunity');
        }
    }

    if (status==='psn' || status==='tox') {
        if (types.includes('Poison') ||
            types.includes('Steel')) {
            return blocked('type_immunity');
        }

        if (ability==='immunity') {
            return blocked('ability_immunity');
        }
    }

    if (status==='par') {
        if (move.id==='thunderwave') {
            if (types.includes('Ground')) {
                return blocked('ground_type');
            }

            if (['voltabsorb','motordrive']
                .includes(ability)) {
                return blocked('ability_immunity');
            }
        }

        if (ability==='limber') {
            return blocked('ability_immunity');
        }
    }

    if (status==='slp') {
        if (['insomnia','vitalspirit']
            .includes(ability)) {
            return blocked('ability_immunity');
        }

        if (ability==='leafguard' &&
            conditions.weather==='sun') {
            return blocked('leaf_guard');
        }

        if (conditions.uproar &&
            ability!=='soundproof') {
            return blocked('uproar');
        }
    }

    if (ability==='leafguard' &&
        conditions.weather==='sun') {
        return blocked('leaf_guard');
    }

    const accuracy=move.accuracy===true
        ? 1 : move.accuracy/100;

    const after=structuredClone(target);

    after.status=status;

    if (status==='tox') {
        after.toxicCounter=0;
    }

    if (status==='slp') {
        after.sleepState=createSleepState({
            earlyBird:targetAbility==='earlybird'
        });
    }

    const outcomes=[];

    if (accuracy>0) {
        outcomes.push({
            success:true,
            reason:null,
            probability:accuracy,
            target:after
        });
    }

    if (accuracy<1) {
        outcomes.push({
            success:false,
            reason:'miss',
            probability:1-accuracy,
            target:structuredClone(target)
        });
    }

    return {
        supported:true,
        move:move.name,
        status,
        successProbability:accuracy,
        outcomes
    };
}

module.exports={
    SUPPORTED_MOVES,
    predictStatusInfliction
};