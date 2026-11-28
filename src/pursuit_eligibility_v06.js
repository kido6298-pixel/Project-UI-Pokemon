const id=value=>String(value??'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

function canInterceptPursuit(actor) {
    if (!actor||actor.currentHP<=0) return false;

    if (['slp','frz'].includes(id(actor.status))) {
        return false;
    }

    if (
        id(actor.ability)==='truant' &&
        actor.volatiles?.truant
    ) {
        return false;
    }

    return true;
}

module.exports={canInterceptPursuit};