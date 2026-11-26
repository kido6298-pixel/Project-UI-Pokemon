const {Dex}=require('pokemon-showdown');

const {
    normalizeBoosts,
    applyBoosts
}=require('./boost_value');

const {
    evaluatePokemonV06
}=require('./board_value_v06');

const dex=Dex.mod('gen4');

const HEAL_MOVES=new Set([
    'recover',
    'slackoff',
    'softboiled',
    'milkdrink',
    'roost'
]);

const BOOST_MOVES=Object.freeze({
    calmmind:{spa:1,spd:1},
    swordsdance:{atk:2},
    dragondance:{atk:1,spe:1},
    nastyplot:{spa:2},
    bulkup:{atk:1,def:1},
    agility:{spe:2},
    curse:{atk:1,def:1,spe:-1}
});

function getStatusMoveEffect(moveName,pokemon) {
    const move=dex.moves.get(moveName);

    if (!move.exists ||
        move.gen>4 ||
        move.category!=='Status') {
        return null;
    }

    if (HEAL_MOVES.has(move.id)) {
        return {
            move:move.name,
            type:'heal',
            fraction:0.5,
            priority:move.priority,
            requiresTimingModel:move.id==='roost'
        };
    }

    if (Object.hasOwn(BOOST_MOVES,move.id)) {
        if (move.id==='curse') {
            const types=pokemon.types ??
                dex.species.get(pokemon.species).types;

            if (!types || types.includes('Ghost')) {
                return null;
            }
        }

        return {
            move:move.name,
            type:'boost',
            changes:{...BOOST_MOVES[move.id]},
            priority:move.priority,
            requiresTimingModel:false
        };
    }

    return null;
}

function validatePokemon(pokemon) {
    if (!Number.isSafeInteger(pokemon.maxHP) ||
        !Number.isSafeInteger(pokemon.currentHP) ||
        pokemon.maxHP<=0 ||
        pokemon.currentHP<0 ||
        pokemon.currentHP>pokemon.maxHP) {
        throw new Error('Invalid Pokemon HP');
    }
}

function boardPokemon(pokemon) {
    return {
        ...pokemon,
        hpRatio:pokemon.currentHP/pokemon.maxHP,
        fainted:pokemon.currentHP===0,
        active:true
    };
}

function predictStatusMove(pokemon,moveName) {
    validatePokemon(pokemon);

    const effect=getStatusMoveEffect(
        moveName,pokemon
    );

    if (!effect) {
        return {
            supported:false,
            reason:'unsupported_move'
        };
    }

    const before={
        ...pokemon,
        boosts:normalizeBoosts(pokemon.boosts)
    };

    const after=structuredClone(before);

    if (before.currentHP===0) {
        return {
            supported:true,
            success:false,
            reason:'fainted',
            effect,
            before,
            after,
            valueChange:0
        };
    }

    let changed=false;

    if (effect.type==='heal') {
        after.currentHP=Math.min(
            before.maxHP,
            before.currentHP+
                Math.floor(
                    before.maxHP*effect.fraction
                )
        );

        changed=
            after.currentHP!==before.currentHP;
    }

    if (effect.type==='boost') {
        after.boosts=applyBoosts(
            before.boosts,effect.changes
        );

        changed=Object.keys(after.boosts).some(
            stat=>
                after.boosts[stat]!==
                before.boosts[stat]
        );
    }

    const beforeValue=evaluatePokemonV06(
        boardPokemon(before)
    ).value;

    const afterValue=evaluatePokemonV06(
        boardPokemon(after)
    ).value;

    return {
        supported:true,
        success:changed,
        reason:changed
            ? null
            : 'no_state_change',
        effect,
        before,
        after,
        beforeValue,
        afterValue,
        valueChange:afterValue-beforeValue
    };
}

module.exports={
    getStatusMoveEffect,
    predictStatusMove
};