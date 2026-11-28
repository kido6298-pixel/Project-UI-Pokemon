const {
    predictRestrictedTurnV06
}=require('./turn_prediction_v06_switch_base');

const {
    createParty,
    createPartyMember,
    memberConfig,
    evaluatePartyBoard,
    predictVoluntarySwitch
}=require('./party_state_v06');

const {
    predictEndTurnV06
}=require('./end_turn_v06');

const {
    tickScreens
}=require('./screen_control_v06');

const {
    tickMoveRestrictions
}=require('./move_restriction_v06');

function validateAction(action) {
    if (!action ||
        !['move','switch'].includes(action.type)) {
        throw new Error('Invalid action');
    }

    if (action.type==='move' &&
        typeof action.move!=='string') {
        throw new Error('Invalid move');
    }

    if (action.type==='switch' &&
        !Number.isSafeInteger(action.index)) {
        throw new Error('Invalid switch index');
    }
}

function predictPartyTurnV06({
    own,enemy,
    ownAction,enemyAction,
    hazardField={},
    residual=true,
    weather='none',
    weatherSuppressed=false,
    ownTrapped=false,
    enemyTrapped=false,
    ...options
}) {
    validateAction(ownAction);
    validateAction(enemyAction);

    let a=structuredClone(own);
    let b=structuredClone(enemy);

    const initialValue=evaluatePartyBoard({
        own:a,enemy:b,hazardField
    }).advantage;

    const ownSwitch=ownAction.type==='switch';
    const enemySwitch=enemyAction.type==='switch';

    const switchEvents=[];

    if (ownSwitch) {
        const result=predictVoluntarySwitch({
            party:a,
            index:ownAction.index,
            field:hazardField,
            trapped:ownTrapped
        });

        a=result.party;

        switchEvents.push({
            side:'own',
            species:a.active.species,
            hazards:result.hazards
        });
    }

    if (enemySwitch) {
        const result=predictVoluntarySwitch({
            party:b,
            index:enemyAction.index,
            field:hazardField,
            trapped:enemyTrapped
        });

        b=result.party;

        switchEvents.push({
            side:'enemy',
            species:b.active.species,
            hazards:result.hazards
        });
    }

    const outcomes=[];

    function save(x,y,probability) {
        const ownParty=structuredClone(x);
        const enemyParty=structuredClone(y);

        const board=evaluatePartyBoard({
            own:ownParty,
            enemy:enemyParty,
            hazardField
        });

        outcomes.push({
            own:ownParty,
            enemy:enemyParty,
            ownHP:ownParty.active.currentHP,
            enemyHP:enemyParty.active.currentHP,
            ownNeedsReplacement:
                ownParty.active.currentHP===0 &&
                ownParty.reserves.some(
                    p=>p.currentHP>0
                ),
            enemyNeedsReplacement:
                enemyParty.active.currentHP===0 &&
                enemyParty.reserves.some(
                    p=>p.currentHP>0
                ),
            value:board.advantage,
            probability
        });
    }

    function finish(x,y,probability) {
        if (!residual) {
            save(x,y,probability);
            return;
        }

        const suppressed=weatherSuppressed ||
            [x.active,y.active].some(p=>
                p.currentHP>0 &&
                ['airlock','cloudnine'].includes(
                    String(p.ability)
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g,'')
                )
            );

        const settings={
            weather,
            weatherSuppressed:suppressed
        };

        const left=predictEndTurnV06(
            x.active,settings
        );

        const right=predictEndTurnV06(
            y.active,settings
        );

        for (const l of left.outcomes) {
            for (const r of right.outcomes) {
                save({
                    ...x,
                    active:tickMoveRestrictions(
                        l.state
                    ),
                    conditions:tickScreens(
                        x.conditions
                    ).conditions
                },{
                    ...y,
                    active:tickMoveRestrictions(
                        r.state
                    ),
                    conditions:tickScreens(
                        y.conditions
                    ).conditions
                },
                probability*
                l.probability*
                r.probability);
            }
        }
    }

    if ((ownSwitch && enemySwitch) ||
        a.active.currentHP===0 ||
        b.active.currentHP===0) {

        finish(a,b,1);

    } else {
        // A synthetic inactive action is used only
        // for the side that has already switched.
        // Its state is restored after prediction.

        const ownConfig=memberConfig(a.active);
        const enemyConfig=memberConfig(b.active);

        function inactive(config) {
            return {
                ...config,
                status:'',
                restrictions:{},
                moveSlots:null,
                sleepState:null
            };
        }

        const originalDamage=
            options.damageCalculator ??
            require('./damage').predictDamage;

        const result=predictRestrictedTurnV06({
            ...options,
            own:ownSwitch
                ? ownConfig
                : ownConfig,
            enemy:enemySwitch
                ? enemyConfig
                : enemyConfig,
            ownMove:ownSwitch
                ? '__switch_wait__'
                : ownAction.move,
            enemyMove:enemySwitch
                ? '__switch_wait__'
                : enemyAction.move,
            ownReserves:a.reserves.map(memberConfig),
            enemyReserves:b.reserves.map(memberConfig),
            ownConditions:a.conditions,
            enemyConditions:b.conditions,
            hazardField,
            weather,
            weatherSuppressed,
            residual:false,
            damageCalculator:originalDamage
        });

        for (const o of result.outcomes) {
            finish({
                ...a,
                active:createPartyMember(
                    o.ownConfig,true
                ),
                conditions:o.ownConditions
            },{
                ...b,
                active:createPartyMember(
                    o.enemyConfig,true
                ),
                conditions:o.enemyConditions
            },o.probability);
        }
    }

    const result={
        initialValue,
        expectedValue:0,
        expectedOwnHP:0,
        expectedEnemyHP:0,
        probabilitySum:0,
        switchEvents,
        outcomes
    };

    for (const o of outcomes) {
        result.expectedValue+=
            o.value*o.probability;

        result.expectedOwnHP+=
            o.ownHP*o.probability;

        result.expectedEnemyHP+=
            o.enemyHP*o.probability;

        result.probabilitySum+=o.probability;
    }

    if (Math.abs(
        result.probabilitySum-1
    )>1e-8) {
        throw new Error('Invalid probability sum');
    }

    result.expectedChange=
        result.expectedValue-initialValue;

    return result;
}

module.exports={predictPartyTurnV06};