const {predictDamage}=require('./damage');

const {
    prepareResolvedAbility
}=require('./damage_v06_resolved');

function predictResolvedDamageV06({
    attacker,
    defender,
    move,
    field={},
    moveOptions={}
}) {
    return predictDamage({
        attacker:prepareResolvedAbility(attacker),
        defender:prepareResolvedAbility(defender),
        move,
        field,
        moveOptions
    });
}

module.exports={
    prepareResolvedAbility,
    predictResolvedDamageV06
};