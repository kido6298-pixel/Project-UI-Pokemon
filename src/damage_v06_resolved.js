const {predictDamage}=require('./damage');

function prepareResolvedAbility(config) {
    const next=structuredClone(config);

    const ability=String(next.ability??'')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');

    if (ability==='intimidate') {
        next.abilityOn=false;
    }

    if (ability==='download') {
        next.ability='Pressure';
        next.abilityOn=false;
    }

    return next;
}

function predictResolvedDamageV06(
    attacker,defender,moveName,field={}
) {
    return predictDamage(
        prepareResolvedAbility(attacker),
        prepareResolvedAbility(defender),
        moveName,
        field
    );
}

module.exports={
    prepareResolvedAbility,
    predictResolvedDamageV06
};