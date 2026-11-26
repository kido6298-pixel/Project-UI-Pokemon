const {Dex}=require('pokemon-showdown');
const dex=Dex.mod('gen4');

const SCREENS=Object.freeze({
    reflect:'Reflect',
    lightscreen:'Light Screen'
});

function id(value) {
    return String(value??'')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

function screenName(key) {
    return SCREENS[id(
        key.replace(/^move:\s*/i,'')
    )];
}

function normalizeScreens(conditions={}) {
    const result={};

    for (const [key,value] of Object.entries(
        conditions
    )) {
        const name=screenName(key);

        if (!name) continue;

        const remaining=typeof value==='object'
            ? value?.remaining
            : value;

        if (!Number.isInteger(remaining)||
            remaining<0||remaining>8) {
            throw new Error(
                'Invalid screen duration: '+name
            );
        }

        if (remaining>0) {
            result[name]=Math.max(
                result[name]??0,
                remaining
            );
        }
    }

    return result;
}

function predictScreen({
    actor,
    moveName,
    conditions={},
    itemSuppressed=false
}) {
    const move=dex.moves.get(moveName);
    const name=SCREENS[move.id];

    if (!name) {
        return {
            supported:false,
            success:false
        };
    }

    const next=structuredClone(conditions);

    function fail(reason) {
        return {
            supported:true,
            success:false,
            reason,
            conditions:next
        };
    }

    if (actor.currentHP<=0) {
        return fail('fainted');
    }

    if (normalizeScreens(conditions)[name]) {
        return fail('already_active');
    }

    const item=id(
        actor.item??actor.config?.item
    );

    const ability=id(
        actor.ability??actor.config?.ability
    );

    const duration=
        item==='lightclay'&&
        !itemSuppressed&&
        ability!=='klutz'
            ? 8 : 5;

    for (const key of Object.keys(next)) {
        if (screenName(key)===name) {
            delete next[key];
        }
    }

    next[name]=duration;

    return {
        supported:true,
        success:true,
        duration,
        conditions:next
    };
}

function tickScreens(conditions={}) {
    const next=structuredClone(conditions);
    const screens=normalizeScreens(conditions);
    const expired=[];

    for (const key of Object.keys(next)) {
        if (screenName(key)) {
            delete next[key];
        }
    }

    for (const [name,remaining] of
        Object.entries(screens)) {

        if (remaining>1) {
            next[name]=remaining-1;
        } else {
            expired.push(name);
        }
    }

    return {
        conditions:next,
        expired
    };
}

function removeScreens(conditions={}) {
    const next=structuredClone(conditions);
    const removed=[];

    for (const key of Object.keys(next)) {
        const name=screenName(key);

        if (!name) continue;

        delete next[key];

        if (!removed.includes(name)) {
            removed.push(name);
        }
    }

    return {
        conditions:next,
        removed
    };
}

function screenDamageMultiplier({
    conditions={},
    moveName,
    critical=false
}) {
    const move=dex.moves.get(moveName);

    if (!move.exists) {
        throw new Error('Unknown move');
    }

    if (critical||move.damage||
        move.damageCallback) {
        return 1;
    }

    const screens=normalizeScreens(conditions);

    if (move.category==='Physical'&&
        screens.Reflect) return 0.5;

    if (move.category==='Special'&&
        screens['Light Screen']) return 0.5;

    return 1;
}

function screenField(conditions={}) {
    const screens=normalizeScreens(conditions);

    return {
        isReflect:!!screens.Reflect,
        isLightScreen:!!screens['Light Screen']
    };
}

module.exports={
    normalizeScreens,
    predictScreen,
    tickScreens,
    removeScreens,
    screenDamageMultiplier,
    screenField
};