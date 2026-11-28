const {Dex}=require('pokemon-showdown');
const {Pokemon,Generations}=require('@smogon/calc');

const {predictDamage}=require('./damage');
const {predictOrder}=require('./speed');
const {damageDistribution}=require('./attack_turn');
const {isSimpleAttack}=require('./move_candidates');
const {normalizeBoosts}=require('./boost_value');
const {evaluatePokemonV06}=require('./board_value_v06');

const {
    getStatusMoveEffect,
    predictStatusMove
}=require('./status_move_effects');

const {
    predictStatusActionV06
}=require('./status_action_v06');

const {
    SUPPORTED_MOVES,
    predictStatusInfliction
}=require('./status_infliction');

const {
    predictEndTurnV06
}=require('./end_turn_v06');

const {
    getFieldControlEffect,
    predictFieldControl
}=require('./field_control_v06');

const {
    evaluateHazardAdvantage
}=require('./hazard_value_v06_corrected');

const {
    predictScreen,
    tickScreens,
    removeScreens,
    screenField
}=require('./screen_control_v06');

const {
    predictRapidSpinRemoval
}=require('./hazard_removal_v06_corrected');

const SCREEN_MOVES=new Set([
    'reflect','lightscreen'
]);

const CONTROL_ATTACKS=new Set([
    'brickbreak','rapidspin'
]);

const {
    predictMoveRestriction,
    resolveRestrictedMove,
    tickMoveRestrictions
}=require('./move_restriction_v06');

const RESTRICTION_MOVES=new Set([
    'taunt','encore'
]);

const {
    predictForcedSwitch
}=require('./switch_control_v06_corrected');

const {
    createPartyMember,
    memberConfig
}=require('./party_state_v06');

const FORCED_MOVES=new Set([
    'roar','whirlwind'
]);

const dex=Dex.mod('gen4');
const gen=Generations.get(4);

function createState(config,moves=[]) {
    const {species,...options}=config;

    const pokemon=new Pokemon(gen,species,{
        level:50,...options
    });

    const attacks=moves
        .map(name=>dex.moves.get(name))
        .filter(move=>move.category!=='Status');

    return {
        config:structuredClone(config),
        species,
        types:config.types ??
            dex.species.get(species).types,
        active:true,
        fainted:false,
        volatiles:structuredClone(
            config.volatiles??{}
        ),
        ingrain:!!config.ingrain,
        substitute:!!config.substitute,
        ability:config.ability ?? '',
        item:config.item ?? '',
        maxHP:pokemon.maxHP(),
        currentHP:config.curHP ??
            pokemon.curHP(),
        status:config.status || null,
        boosts:normalizeBoosts(config.boosts),
        restrictions:structuredClone(
            config.restrictions ?? {}
        ),
        lastMove:config.lastMove ?? null,
        moveSlots:structuredClone(
            config.moveSlots ?? null
        ),
        toxicCounter:config.toxicCounter ?? 0,
        sleepState:structuredClone(
            config.sleepState ?? null
        ),
        attackProfile:moves.length
            ? {
                physical:attacks.some(
                    m=>m.category==='Physical'
                ),
                special:attacks.some(
                    m=>m.category==='Special'
                )
            }
            : {physical:true,special:true}
    };
}

function toConfig(state) {
    return {
        ...state.config,
        species:state.species,
        ability:state.ability,
        active:state.active!==false,
        fainted:state.currentHP===0,
        volatiles:structuredClone(
            state.volatiles??{}
        ),
        ingrain:!!state.ingrain,
        substitute:!!state.substitute,
        item:state.item,
        curHP:state.currentHP,
        status:state.status || '',
        boosts:{...state.boosts},
        restrictions:structuredClone(
            state.restrictions ?? {}
        ),
        lastMove:state.lastMove ?? null,
        moveSlots:structuredClone(
            state.moveSlots ?? null
        ),
        toxicCounter:state.toxicCounter,
        sleepState:structuredClone(
            state.sleepState
        )
    };
}

function value(state) {
    return evaluatePokemonV06({
        ...state,
        hpRatio:state.currentHP/state.maxHP,
        fainted:state.currentHP===0,
        active:true
    }).value;
}

function supportedMove(name,state) {
    if (name==='__switch_wait__') {
        return {
            id:'switchwait',
            name:'__switch_wait__',
            priority:7,
            category:'Status'
        };
    }

    const move=dex.moves.get(name);

    if (!move.exists || move.gen>4) {
        throw new Error('Unknown move: '+name);
    }

    if (move.category==='Status') {
        if (FORCED_MOVES.has(move.id)) {
            return move;
        }

        if (RESTRICTION_MOVES.has(move.id)) {
            return move;
        }

        if (SCREEN_MOVES.has(move.id)) {
            return move;
        }

        if (getFieldControlEffect(move.name)) {
            return move;
        }

        if (Object.hasOwn(
            SUPPORTED_MOVES,move.id
        )) return move;

        const effect=getStatusMoveEffect(
            name,state
        );

        if (!effect || effect.requiresTimingModel) {
            throw new Error(
                'Unsupported status move: '+name
            );
        }
    } else if (
        !CONTROL_ATTACKS.has(move.id) &&
        !isSimpleAttack(move)
    ) {
        throw new Error(
            'Unsupported attack: '+name
        );
    }

    return move;
}

function executeMove({
    actor,target,move,field,
    conditions,actorConditions={},
    targetSideConditions={},damageCalculator,
    targetReserves=[],hazardField={}
}) {
    if (FORCED_MOVES.has(move.id)) {
        const result=predictForcedSwitch({
            actor,
            target,
            reserves:targetReserves,
            moveName:move.name,
            conditions:{
                ...targetSideConditions,
                ...(conditions.protect
                    ? {protect:true}: {})
            },
            field:hazardField
        });

        if (!result.supported) {
            throw new Error(
                'Unsupported forced switch'
            );
        }

        return result.outcomes.map(o=>({
            actor,
            target:o.active,
            targetReserves:o.reserves,
            targetConditions:o.success
                ? o.conditions
                : targetSideConditions,
            cancelPendingAction:
                !!o.cancelPendingAction,
            forcedSwitch:{
                success:o.success,
                reason:o.reason,
                outgoing:target.species,
                incoming:o.active.species,
                selectedIndex:
                    o.selectedIndex??null,
                hazards:o.hazards??null
            },
            probability:o.probability
        }));
    }

    if (RESTRICTION_MOVES.has(move.id)) {
        const result=predictMoveRestriction({
            actor,
            target,
            moveName:move.name,
            conditions
        });

        if (!result.supported) {
            throw new Error(
                result.reason ??
                'Unsupported restriction'
            );
        }

        return result.outcomes.map(o=>({
            actor,
            target:o.target,
            probability:o.probability
        }));
    }

    if (SCREEN_MOVES.has(move.id)) {
        const result=predictScreen({
            actor,
            moveName:move.name,
            conditions:actorConditions,
            itemSuppressed:!!actor.config?.itemSuppressed
        });

        return [{
            actor,
            target,
            actorConditions:result.conditions,
            targetConditions:targetSideConditions,
            probability:1
        }];
    }

    if (getFieldControlEffect(move.name)) {
        const result=predictFieldControl({
            actor,
            target,
            moveName:move.name,
            ownConditions:actorConditions,
            enemyConditions:targetSideConditions
        });

        return [{
            actor:result.actor,
            target:result.target,
            actorConditions:result.ownConditions,
            targetConditions:result.enemyConditions,
            probability:1
        }];
    }

    if (Object.hasOwn(
        SUPPORTED_MOVES,move.id
    )) {
        const result=predictStatusInfliction({
            moveName:move.name,
            attacker:actor,
            target,
            conditions
        });

        if (!result.supported) {
            throw new Error(result.reason);
        }

        return result.outcomes.map(o=>({
            actor,
            target:applyImmediateBerry(o.target),
            probability:o.probability
        }));
    }

    if (move.category==='Status') {
        const result=predictStatusMove(
            actor,move.name
        );

        if (!result.supported) {
            throw new Error(result.reason);
        }

        return [{
            actor:applyImmediateBerry(result.after),
            target,
            probability:1
        }];
    }

    const accuracy=move.accuracy===true
        ? 1 : move.accuracy/100;

    if (conditions.protect) {
        return [{actor,target,probability:1}];
    }

    let nextTargetConditions=
        targetSideConditions;

    if (move.id==='brickbreak') {
        nextTargetConditions=
            removeScreens(targetSideConditions)
                .conditions;
    }

    const screens=screenField(
        nextTargetConditions
    );

    const effectiveField={
        ...field,
        defenderSide:{
            ...field.defenderSide,
            ...screens
        }
    };

    const damage=damageCalculator({
        attacker:toConfig(actor),
        defender:toConfig(target),
        move:move.name,
        field:effectiveField
    });

    if (!damage.rolls) {
        throw new Error(
            'Unsupported damage distribution'
        );
    }

    const outcomes=[];

    if (accuracy<1) {
        outcomes.push({
            actor,target,
            probability:1-accuracy
        });
    }

    for (const o of damageDistribution(
        damage.rolls,1
    )) {
        let nextActorConditions=
            actorConditions;

        if (move.id==='rapidspin') {
            nextActorConditions=
                predictRapidSpinRemoval({
                    conditions:actorConditions,
                    hit:true,
                    damage:o.damage,
                    actorAlive:actor.currentHP>0
                }).conditions;
        }

        outcomes.push({
            actor,
            target:{
                ...target,
                currentHP:Math.max(
                    0,target.currentHP-o.damage
                )
            },
            actorConditions:nextActorConditions,
            targetConditions:nextTargetConditions,
            probability:o.probability*accuracy
        });
    }

    return outcomes;
}

function normalizeId(value) {
    return String(value??'')
        .toLowerCase()
        .replace(/[^a-z0-9]/g,'');
}

function applyImmediateBerry(state) {
    if (state.currentHP<=0) return state;

    const item=normalizeId(state.item);

    const consume=
        (item==='lumberry'&&state.status)||
        (item==='chestoberry'&&state.status==='slp');

    if (!consume) return state;

    return {
        ...state,
        item:'',
        status:null,
        sleepState:null,
        toxicCounter:0,
        config:{
            ...state.config,
            item:'',
            status:'',
            sleepState:null,
            toxicCounter:0
        }
    };
}

function recordMoveUse(actor,target,move) {
    const next={
        ...actor,
        lastMove:move.id,
        moveSlots:structuredClone(
            actor.moveSlots
        )
    };

    if (Array.isArray(next.moveSlots)) {
        const slot=next.moveSlots.find(
            s=>normalizeId(s.id??s.move)
                ===move.id
        );

        if (!slot || slot.pp<=0) {
            throw new Error(
                'Move PP unavailable: '+move.name
            );
        }

        const pressure=
            normalizeId(target.ability)==='pressure'
            && (
                move.target==='normal' ||
                FORCED_MOVES.has(move.id)
            );

        slot.pp=Math.max(
            0,slot.pp-(pressure?2:1)
        );
    }

    return next;
}

function resolveAction(input) {
    const {actor,target}=input;
    let move=input.move;

    if (move.id==='switchwait') {
        return [{actor,target,probability:1}];
    }

    if (actor.currentHP===0 ||
        target.currentHP===0) {
        return [{
            actor,target,probability:1
        }];
    }

    const restriction=resolveRestrictedMove(
        actor,move.name
    );

    if (!restriction.supported) {
        throw new Error(restriction.reason);
    }

    move=supportedMove(
        restriction.move,actor
    );

    const action=predictStatusActionV06({
        status:actor.status,
        currentHP:actor.currentHP,
        moveName:move.name,
        ability:actor.ability,
        sleepState:actor.sleepState
    });

    if (!action.supported) {
        throw new Error(
            'Unsupported action state: '+
            action.reason
        );
    }

    const outcomes=[];

    for (const branch of action.outcomes) {
        const nextActor={
            ...actor,
            status:branch.status || null,
            sleepState:branch.status==='slp'
                ? branch.sleepState ??
                    actor.sleepState
                : null
        };

        if (!branch.canAct ||
            !restriction.canAct) {
            outcomes.push({
                actor:nextActor,
                target,
                probability:branch.probability
            });
            continue;
        }

        const usedActor=recordMoveUse(
            nextActor,target,move
        );

        for (const result of executeMove({
            ...input,
            move,
            actor:usedActor
        })) {
            outcomes.push({
                ...result,
                probability:
                    branch.probability*
                    result.probability
            });
        }
    }

    return outcomes;
}

function suppressesWeather(state) {
    return state.currentHP>0 &&
        ['airlock','cloudnine']
            .includes(normalizeId(state.ability));
}

function endTurnBranches(own,enemy,{
    weather,residual,weatherSuppressed
}) {
    if (!residual) {
        return [{
            own,enemy,probability:1
        }];
    }

    const suppressed=
        weatherSuppressed ||
        suppressesWeather(own) ||
        suppressesWeather(enemy);

    const options={
        weather,
        weatherSuppressed:suppressed
    };

    const a=predictEndTurnV06(own,options);
    const b=predictEndTurnV06(enemy,options);

    const results=[];

    for (const x of a.outcomes) {
        for (const y of b.outcomes) {
            results.push({
                own:x.state,
                enemy:y.state,
                probability:
                    x.probability*y.probability
            });
        }
    }

    return results;
}

function stateKey(state) {
    return [
        state.species,
        state.ability,
        state.currentHP,
        state.status,
        state.item,
        state.boosts,
        state.toxicCounter,
        state.sleepState,
        state.restrictions,
        state.lastMove,
        state.moveSlots
    ];
}

function predictRestrictedTurnV06({
    own,
    enemy,
    ownMove,
    enemyMove,
    ownMoves=[],
    enemyMoves=[],
    ownReserves=[],
    enemyReserves=[],
    ownConditions={},
    enemyConditions={},
    hazardField={},
    attackField={},
    defenseField={},
    attackConditions={},
    defenseConditions={},
    trickRoom=false,
    residual=true,
    weather='none',
    weatherSuppressed=false,
    damageCalculator=predictDamage,
    orderCalculator=predictOrder
}) {
    ownConditions=structuredClone(ownConditions);
    enemyConditions=structuredClone(enemyConditions);

    const ownPartyReserves=ownReserves.map(
        p=>createPartyMember(p,false)
    );

    const enemyPartyReserves=enemyReserves.map(
        p=>createPartyMember(p,false)
    );

    function boardValue(a,b,ac,bc) {
        const hazards=evaluateHazardAdvantage({
            ownReserves,
            enemyReserves,
            ownConditions:ac,
            enemyConditions:bc,
            field:hazardField
        });

        return value(a)-value(b)+hazards.advantage;
    }

    const initialOwn=applyImmediateBerry(
        createState(own,ownMoves)
    );

    const initialEnemy=applyImmediateBerry(
        createState(enemy,enemyMoves)
    );

    const suppressed=
        weatherSuppressed ||
        suppressesWeather(initialOwn) ||
        suppressesWeather(initialEnemy);

    const aliases={
        raindance:'rain',
        sunnyday:'sun',
        sand:'sandstorm'
    };

    const weatherId=normalizeId(weather);
    const effectiveWeather=suppressed
        ? 'none'
        : aliases[weatherId]??weatherId;

    attackConditions={
        ...attackConditions,
        weather:effectiveWeather
    };

    defenseConditions={
        ...defenseConditions,
        weather:effectiveWeather
    };

    for (const state of [
        initialOwn,initialEnemy
    ]) {
        if (!Number.isSafeInteger(
            state.currentHP
        ) ||
            state.currentHP<=0 ||
            state.currentHP>state.maxHP) {
            throw new Error('Invalid active HP');
        }

        if (state.status==='slp' &&
            !state.sleepState) {
            throw new Error(
                'Missing sleep state'
            );
        }
    }

    function initialMove(name,state) {
        if (name==='__switch_wait__') {
            return supportedMove(name,state);
        }
        const restriction=
            resolveRestrictedMove(state,name);

        if (!restriction.supported) {
            throw new Error(restriction.reason);
        }

        return supportedMove(
            restriction.move,state
        );
    }

    const attack=initialMove(
        ownMove,initialOwn
    );

    const counter=initialMove(
        enemyMove,initialEnemy
    );

    const order=orderCalculator({
        attacker:toConfig(initialOwn),
        defender:toConfig(initialEnemy),
        attackerPriority:attack.priority,
        defenderPriority:counter.priority,
        trickRoom
    });

    if (!(order.firstChance>=0 &&
          order.firstChance<=1)) {
        throw new Error('Invalid first chance');
    }

    const outcomes=new Map();

    for (const ownFirst of [true,false]) {
        const orderProbability=ownFirst
            ? order.firstChance
            : 1-order.firstChance;

        if (!orderProbability) continue;

        const first=resolveAction({
            actor:ownFirst
                ? initialOwn : initialEnemy,
            target:ownFirst
                ? initialEnemy : initialOwn,
            move:ownFirst ? attack : counter,
            targetReserves:ownFirst
                ? enemyPartyReserves
                : ownPartyReserves,
            hazardField,
            field:ownFirst
                ? attackField : defenseField,
            actorConditions:ownFirst
                ? ownConditions : enemyConditions,
            targetSideConditions:ownFirst
                ? enemyConditions : ownConditions,
            conditions:ownFirst
                ? {...attackConditions,...enemyConditions}
                : {...defenseConditions,...ownConditions},
            damageCalculator
        });

        for (const a of first) {
            const firstActorConditions=
                a.actorConditions ??
                (ownFirst ? ownConditions : enemyConditions);

            const firstTargetConditions=
                a.targetConditions ??
                (ownFirst ? enemyConditions : ownConditions);

            const firstActorReserves=
                ownFirst
                    ? ownPartyReserves
                    : enemyPartyReserves;

            const firstTargetReserves=
                a.targetReserves ??
                (ownFirst
                    ? enemyPartyReserves
                    : ownPartyReserves);

            const second=a.cancelPendingAction
                ? [{
                    actor:a.target,
                    target:a.actor,
                    probability:1
                }]
                : resolveAction({
                targetReserves:firstActorReserves,
                hazardField,
                actor:a.target,
                target:a.actor,
                move:ownFirst ? counter : attack,
                field:ownFirst
                    ? defenseField : attackField,
                actorConditions:firstTargetConditions,
                targetSideConditions:firstActorConditions,
                conditions:{
                    ...(ownFirst
                        ? defenseConditions
                        : attackConditions),
                    ...firstActorConditions
                },
                damageCalculator
            });

            for (const b of second) {
                const secondActorReserves=
                    firstTargetReserves;

                const secondTargetReserves=
                    b.targetReserves ??
                    firstActorReserves;

                const finalOwnReserves=ownFirst
                    ? secondTargetReserves
                    : secondActorReserves;

                const finalEnemyReserves=ownFirst
                    ? secondActorReserves
                    : secondTargetReserves;

                const forcedSwitchEvents=[];

                if (a.forcedSwitch) {
                    forcedSwitchEvents.push({
                        side:ownFirst?'own':'enemy',
                        ...a.forcedSwitch
                    });
                }

                if (b.forcedSwitch) {
                    forcedSwitchEvents.push({
                        side:ownFirst?'enemy':'own',
                        ...b.forcedSwitch
                    });
                }

                const secondActorConditions=
                    b.actorConditions ??
                    firstTargetConditions;

                const secondTargetConditions=
                    b.targetConditions ??
                    firstActorConditions;

                let finalOwnConditions=ownFirst
                    ? secondTargetConditions
                    : secondActorConditions;

                let finalEnemyConditions=ownFirst
                    ? secondActorConditions
                    : secondTargetConditions;

                if (residual) {
                    finalOwnConditions=
                        tickScreens(
                            finalOwnConditions
                        ).conditions;

                    finalEnemyConditions=
                        tickScreens(
                            finalEnemyConditions
                        ).conditions;
                }

                let finalOwn=ownFirst
                    ? b.target : b.actor;

                let finalEnemy=ownFirst
                    ? b.actor : b.target;

                const branches=endTurnBranches(
                    finalOwn,finalEnemy,{
                        weather,
                        residual,
                        weatherSuppressed
                    }
                );

                for (const branch of branches) {
                    finalOwn=residual
                        ? tickMoveRestrictions(
                            branch.own
                        )
                        : branch.own;

                    finalEnemy=residual
                        ? tickMoveRestrictions(
                            branch.enemy
                        )
                        : branch.enemy;

                const probability=
                    orderProbability*
                    a.probability*
                    b.probability*
                    branch.probability;

                if (!probability) continue;

                const key=JSON.stringify([
                    stateKey(finalOwn),
                    stateKey(finalEnemy),
                    finalOwnReserves.map(memberConfig),
                    finalEnemyReserves.map(memberConfig),
                    forcedSwitchEvents,
                    finalOwnConditions,
                    finalEnemyConditions
                ]);

                const existing=outcomes.get(key);

                if (existing) {
                    existing.probability+=
                        probability;
                } else {
                    outcomes.set(key,{
                        ownHP:finalOwn.currentHP,
                        enemyHP:finalEnemy.currentHP,
                        ownBoosts:finalOwn.boosts,
                        enemyBoosts:finalEnemy.boosts,
                        ownStatus:finalOwn.status,
                        enemyStatus:finalEnemy.status,
                        ownItem:finalOwn.item,
                        enemyItem:finalEnemy.item,
                        ownConfig:toConfig(finalOwn),
                        enemyConfig:toConfig(finalEnemy),
                        ownReserves:
                            finalOwnReserves.map(memberConfig),
                        enemyReserves:
                            finalEnemyReserves.map(memberConfig),
                        forcedSwitchEvents:
                            structuredClone(forcedSwitchEvents),
                        ownConditions:structuredClone(
                            finalOwnConditions
                        ),
                        enemyConditions:structuredClone(
                            finalEnemyConditions
                        ),
                        value:boardValue(
                            finalOwn,
                            finalEnemy,
                            finalOwnConditions,
                            finalEnemyConditions
                        ),
                        probability
                    });
                }
            }
        }
    }

    }

    const result={
        ownMove:attack.name,
        enemyMove:counter.name,
        order,
        initialValue:boardValue(
            initialOwn,
            initialEnemy,
            ownConditions,
            enemyConditions
        ),
        expectedValue:0,
        expectedOwnHP:0,
        expectedEnemyHP:0,
        ownKOChance:0,
        enemyKOChance:0,
        probabilitySum:0,
        outcomes:[...outcomes.values()]
    };

    for (const o of result.outcomes) {
        const p=o.probability;

        result.expectedValue+=o.value*p;
        result.expectedOwnHP+=o.ownHP*p;
        result.expectedEnemyHP+=o.enemyHP*p;
        result.probabilitySum+=p;

        if (o.ownHP===0) {
            result.ownKOChance+=p;
        }

        if (o.enemyHP===0) {
            result.enemyKOChance+=p;
        }
    }

    if (Math.abs(
        result.probabilitySum-1
    )>1e-8) {
        throw new Error(
            'Invalid outcome probability sum'
        );
    }

    result.expectedChange=
        result.expectedValue-result.initialValue;

    return result;
}

module.exports={predictRestrictedTurnV06};