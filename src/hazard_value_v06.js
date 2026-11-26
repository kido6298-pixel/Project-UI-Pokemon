const {evaluateHazards}=require('./hazards');
const {normalizeHazards}=require('./hazard_normalization');

const DEFAULT_HAZARD_WEIGHTS=Object.freeze({
    hp:0.5,
    psn:0.1,
    tox:0.2,
    futureEntryProbability:0.7
});

function evaluateHazardPressure({
    reserves=[],
    conditions={},
    field={},
    weights=DEFAULT_HAZARD_WEIGHTS
}) {
    const hazards=normalizeHazards(conditions);
    const members=[];

    for (const candidate of reserves) {
        if (candidate.fainted ||
            candidate.active ||
            candidate.curHP===0) continue;

        const result=evaluateHazards(
            candidate,hazards,field
        );

        if (result.currentHP<=0) continue;

        const actualDamage=Math.min(
            result.currentHP,
            result.totalDamage
        );

        const hpLoss=actualDamage/result.maxHP;

        const statusValue=
            result.faintedOnEntry ? 0 :
            result.toxicSpikes==='psn' ? weights.psn :
            result.toxicSpikes==='tox' ? weights.tox : 0;

        const value=(
            hpLoss*weights.hp+statusValue
        )*weights.futureEntryProbability;

        members.push({
            species:candidate.species,
            hpLoss,
            toxicSpikes:result.toxicSpikes,
            faintedOnEntry:result.faintedOnEntry,
            value
        });
    }

    return {
        hazards,
        members,
        value:members.reduce(
            (sum,p)=>sum+p.value,0
        )
    };
}

function evaluateHazardAdvantage({
    ownReserves=[],
    enemyReserves=[],
    ownConditions={},
    enemyConditions={},
    field={},
    weights=DEFAULT_HAZARD_WEIGHTS
}) {
    const ownPressure=evaluateHazardPressure({
        reserves:ownReserves,
        conditions:ownConditions,
        field,
        weights
    });

    const enemyPressure=evaluateHazardPressure({
        reserves:enemyReserves,
        conditions:enemyConditions,
        field,
        weights
    });

    return {
        ownPressure,
        enemyPressure,
        advantage:
            enemyPressure.value-ownPressure.value
    };
}

module.exports={
    DEFAULT_HAZARD_WEIGHTS,
    evaluateHazardPressure,
    evaluateHazardAdvantage
};