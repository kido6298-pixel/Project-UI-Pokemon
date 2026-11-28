const {
    canInterceptPursuit
}=require('./pursuit_eligibility_v06');

const {
    predictPursuitSwitch
}=require('./pursuit_switch_v06_corrected');

const {
    resolveRestrictedMove
}=require('./move_restriction_v06');

function effectiveMove(party,action) {
    if (action.type!=='move') return null;

    const result=resolveRestrictedMove(
        party.active,action.move
    );

    if (!result.supported) {
        throw new Error(result.reason);
    }

    return String(result.move??'')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

const {
    predictRestrictedTurnV06
}=require('./turn_prediction_v06_pursuit_corrected_base');

const {
    createPartyMember,
    memberConfig,
    evaluatePartyBoard
}=require('./party_state_v06_ability');

const {
    predictSwitchPhase,
    resolvePartyEntries
}=require('./entry_integration_v06');

const {
    predictResolvedDamageV06
}=require('./damage_v06_resolved_corrected');

const {
    getEffectiveWeather
}=require('./entry_ability_v06_corrected');

const {
    entrySpeed
}=require('./entry_sequence_v06');

const {
    predictEndTurnV06
}=require('./end_turn_v06');

const {
    tickScreens
}=require('./screen_control_v06');

const {
    tickMoveRestrictions
}=require('./move_restriction_v06');

const CALC_WEATHER={
    rain:'Rain',
    sun:'Sun',
    sandstorm:'Sand',
    hail:'Hail'
};

function weatherField(field={},weather='none') {
    const next=structuredClone(field);

    delete next.weather;

    if (CALC_WEATHER[weather]) {
        next.weather=CALC_WEATHER[weather];
    }

    return next;
}

function weatherOrder({
    attacker,defender,
    attackerPriority=0,
    defenderPriority=0,
    trickRoom=false,
    weather='none'
}) {
    const a=entrySpeed(
        createPartyMember(attacker,true),
        weather
    );

    const b=entrySpeed(
        createPartyMember(defender,true),
        weather
    );

    const firstChance=
        attackerPriority!==defenderPriority
            ? Number(attackerPriority>defenderPriority)
            : a===b
                ? 0.5
                : Number(trickRoom?a<b:a>b);

    return {
        attackerSpeed:a,
        defenderSpeed:b,
        firstChance,
        speedTie:a===b,
        trickRoom
    };
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
    for (const action of [ownAction,enemyAction]) {
        if (!action||
            !['move','switch'].includes(action.type)) {
            throw new Error('Invalid action');
        }

        if (action.type==='move'&&
            typeof action.move!=='string') {
            throw new Error('Invalid move');
        }

        if (action.type==='switch'&&
            !Number.isSafeInteger(action.index)) {
            throw new Error('Invalid switch index');
        }
    }

    const initialValue=evaluatePartyBoard({
        own,enemy,hazardField
    }).advantage;

    const ownSwitch=ownAction.type==='switch';
    const enemySwitch=enemyAction.type==='switch';

    const ownPursuit=
        enemySwitch && canInterceptPursuit(own.active) &&
        effectiveMove(own,ownAction)==='pursuit';

    const enemyPursuit=
        ownSwitch && canInterceptPursuit(enemy.active) &&
        effectiveMove(enemy,enemyAction)==='pursuit';

    let pursuitPhases=null;

    if (ownPursuit||enemyPursuit) {
        const result=predictPursuitSwitch({
            attacker:ownPursuit?own:enemy,
            defender:ownPursuit?enemy:own,
            switchIndex:ownPursuit
                ? enemyAction.index
                : ownAction.index,
            trapped:ownPursuit
                ? enemyTrapped
                : ownTrapped,
            weather,
            weatherSuppressed,
            hazardField,
            field:ownPursuit
                ? options.attackField
                : options.defenseField,
            damageCalculator:options.damageCalculator
        });

        pursuitPhases=result.outcomes.map(o=>({
            ...o,
            own:ownPursuit?o.own:o.enemy,
            enemy:ownPursuit?o.enemy:o.own,
            abilityEvents:(o.abilityEvents??[]).map(
                event=>({
                    ...event,
                    side:ownPursuit
                        ? event.side
                        : event.side==='own'
                            ? 'enemy'
                            : 'own'
                })
            ),
            switchEvents:[{
                side:ownPursuit?'enemy':'own',
                species:o.incomingSpecies,
                faintedOnEntry:o.incomingFainted
            }],
            pursuitEvents:[{
                side:ownPursuit?'own':'enemy',
                damage:o.pursuitDamage,
                outgoing:o.outgoingSpecies,
                incoming:o.incomingSpecies,
                outgoingFainted:o.outgoingFainted,
                incomingFainted:o.incomingFainted,
                selectedIndex:o.selectedIndex
            }],
            pursuitResolved:true
        }));
    }

    const phases=pursuitPhases??predictSwitchPhase({
        own,enemy,
        ownIndex:ownSwitch?ownAction.index:null,
        enemyIndex:enemySwitch?enemyAction.index:null,
        ownTrapped,
        enemyTrapped,
        weather,
        weatherSuppressed,
        hazardField
    });

    const outcomes=[];

    function save(board,probability) {
        const a=structuredClone(board.own);
        const b=structuredClone(board.enemy);

        const climate=getEffectiveWeather({
            own:a.active,
            enemy:b.active,
            weather:board.weather,
            weatherSuppressed
        });

        outcomes.push({
            own:a,
            enemy:b,
            ownHP:a.active.currentHP,
            enemyHP:b.active.currentHP,
            ownNeedsReplacement:
                a.active.currentHP===0&&
                a.reserves.some(p=>p.currentHP>0),
            enemyNeedsReplacement:
                b.active.currentHP===0&&
                b.reserves.some(p=>p.currentHP>0),
            weather:climate.weather,
            effectiveWeather:climate.effectiveWeather,
            weatherSuppressed:climate.suppressed,
            abilityEvents:structuredClone(
                board.abilityEvents??[]
            ),
            switchEvents:structuredClone(
                board.switchEvents??[]
            ),
            forcedSwitchEvents:structuredClone(
                board.forcedSwitchEvents??[]
            ),
            pursuitEvents:structuredClone(
                board.pursuitEvents??[]
            ),
            value:evaluatePartyBoard({
                own:a,enemy:b,hazardField
            }).advantage,
            probability
        });
    }

    function finish(board,probability) {
        if (!residual) {
            save(board,probability);
            return;
        }

        const climate=getEffectiveWeather({
            own:board.own.active,
            enemy:board.enemy.active,
            weather:board.weather,
            weatherSuppressed
        });

        const settings={
            weather:climate.weather,
            weatherSuppressed:climate.suppressed
        };

        const left=predictEndTurnV06(
            board.own.active,settings
        );

        const right=predictEndTurnV06(
            board.enemy.active,settings
        );

        for (const l of left.outcomes) {
            for (const r of right.outcomes) {
                save({
                    ...board,
                    own:{
                        ...board.own,
                        active:tickMoveRestrictions(l.state),
                        conditions:tickScreens(
                            board.own.conditions
                        ).conditions
                    },
                    enemy:{
                        ...board.enemy,
                        active:tickMoveRestrictions(r.state),
                        conditions:tickScreens(
                            board.enemy.conditions
                        ).conditions
                    }
                },probability*l.probability*r.probability);
            }
        }
    }

    for (const phase of phases) {
        const a=phase.own;
        const b=phase.enemy;

        if (phase.pursuitResolved||(ownSwitch&&enemySwitch)||
            a.active.currentHP===0||
            b.active.currentHP===0) {
            finish(phase,phase.probability);
            continue;
        }

        const calculate=
            options.damageCalculator??
            predictResolvedDamageV06;

        const result=predictRestrictedTurnV06({
            ...options,
            own:memberConfig(a.active),
            enemy:memberConfig(b.active),
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
            weather:phase.weather,
            weatherSuppressed,
            residual:false,
            attackField:weatherField(
                options.attackField,
                phase.effectiveWeather
            ),
            defenseField:weatherField(
                options.defenseField,
                phase.effectiveWeather
            ),
            damageCalculator:input=>{
                const climate=getEffectiveWeather({
                    own:createPartyMember(
                        input.attacker,true
                    ),
                    enemy:createPartyMember(
                        input.defender,true
                    ),
                    weather:phase.weather,
                    weatherSuppressed
                });

                return calculate({
                    ...input,
                    field:weatherField(
                        input.field,
                        climate.effectiveWeather
                    )
                });
            },
            orderCalculator:options.orderCalculator??
                (input=>weatherOrder({
                    ...input,
                    weather:phase.effectiveWeather
                }))
        });

        for (const o of result.outcomes) {
            const board={
                own:{
                    ...a,
                    active:createPartyMember(
                        o.ownConfig,true
                    ),
                    reserves:o.ownReserves.map(
                        p=>createPartyMember(p,false)
                    ),
                    conditions:o.ownConditions
                },
                enemy:{
                    ...b,
                    active:createPartyMember(
                        o.enemyConfig,true
                    ),
                    reserves:o.enemyReserves.map(
                        p=>createPartyMember(p,false)
                    ),
                    conditions:o.enemyConditions
                },
                weather:phase.weather,
                abilityEvents:phase.abilityEvents,
                switchEvents:phase.switchEvents,
                forcedSwitchEvents:o.forcedSwitchEvents
            };

            const forced=o.forcedSwitchEvents.filter(
                event=>event.success
            );

            const probability=
                phase.probability*o.probability;

            if (!forced.length) {
                finish(board,probability);
                continue;
            }

            // A successful phazing action cancels the
            // displaced Pokemon's pending action.
            // Resolve its entrant before end-turn effects.
            const entries=resolvePartyEntries({
                own:board.own,
                enemy:board.enemy,
                ownEntering:forced.some(
                    event=>event.side==='enemy'
                ),
                enemyEntering:forced.some(
                    event=>event.side==='own'
                ),
                weather:board.weather,
                weatherSuppressed,
                hazardField
            });

            for (const entry of entries) {
                finish({
                    ...board,
                    ...entry,
                    abilityEvents:[
                        ...board.abilityEvents,
                        ...entry.abilityEvents
                    ]
                },probability*entry.probability);
            }
        }
    }

    const result={
        initialValue,
        expectedValue:0,
        expectedOwnHP:0,
        expectedEnemyHP:0,
        probabilitySum:0,
        outcomes
    };

    for (const o of outcomes) {
        result.expectedValue+=o.value*o.probability;
        result.expectedOwnHP+=o.ownHP*o.probability;
        result.expectedEnemyHP+=o.enemyHP*o.probability;
        result.probabilitySum+=o.probability;
    }

    if (Math.abs(result.probabilitySum-1)>1e-8) {
        throw new Error('Invalid probability sum');
    }

    result.expectedChange=
        result.expectedValue-initialValue;

    return result;
}

module.exports={
    weatherField,
    weatherOrder,
    predictPartyTurnV06
};