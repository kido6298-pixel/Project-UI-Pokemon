const {
    predictRestrictedTurnV06
}=require('./turn_prediction_v06_pursuit_base');

const {
    createPartyMember,
    memberConfig
}=require('./party_state_v06_ability');

const {
    predictPursuitDamage
}=require('./pursuit_damage_v06');

const {
    predictResolvedDamageV06
}=require('./damage_v06_resolved_corrected');

const {
    resolveRestrictedMove
}=require('./move_restriction_v06');

const {
    getEffectiveWeather
}=require('./entry_ability_v06_corrected');

const {
    weatherField
}=require('./turn_prediction_v06_ability');

const id=value=>String(value??'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');

function predictPursuitInterception({
    attacker,
    defender,
    attackerConditions={},
    defenderConditions={},
    weather='none',
    weatherSuppressed=false,
    field={},
    damageCalculator=predictResolvedDamageV06
}) {
    if (
        attacker.currentHP<=0||
        defender.currentHP<=0
    ) {
        throw new Error('Invalid active Pokemon');
    }

    const restriction=resolveRestrictedMove(
        attacker,'Pursuit'
    );

    if (!restriction.supported) {
        throw new Error(restriction.reason);
    }

    if (id(restriction.move)!=='pursuit') {
        throw new Error(
            'Pursuit replaced by move restriction'
        );
    }

    const climate=getEffectiveWeather({
        own:attacker,
        enemy:defender,
        weather,
        weatherSuppressed
    });

    const result=predictRestrictedTurnV06({
        own:memberConfig(attacker),
        enemy:memberConfig(defender),
        ownMove:'Pursuit',
        enemyMove:'__switch_wait__',
        ownConditions:attackerConditions,
        enemyConditions:defenderConditions,
        weather,
        weatherSuppressed,
        residual:false,
        attackField:weatherField(
            field,climate.effectiveWeather
        ),
        orderCalculator:()=>({
            firstChance:1
        }),
        damageCalculator:input=>
            predictPursuitDamage({
                ...input,
                switching:true,
                damageCalculator
            })
    });

    const outcomes=result.outcomes.map(o=>{
        const a=createPartyMember(
            o.ownConfig,true
        );

        const b=createPartyMember(
            o.enemyConfig,true
        );

        const damage=
            defender.currentHP-b.currentHP;

        return {
            attacker:a,
            defender:b,
            attackerConditions:o.ownConditions,
            defenderConditions:o.enemyConditions,
            damage,
            defenderFainted:b.currentHP===0,
            weather:climate.weather,
            probability:o.probability
        };
    });

    return {
        outcomes,
        expectedDamage:outcomes.reduce(
            (sum,o)=>sum+o.damage*o.probability,0
        ),
        koChance:outcomes.reduce(
            (sum,o)=>sum+
                Number(o.defenderFainted)*o.probability,
            0
        ),
        probabilitySum:outcomes.reduce(
            (sum,o)=>sum+o.probability,0
        )
    };
}

module.exports={predictPursuitInterception};