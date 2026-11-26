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
        ability:config.ability ?? '',
        item:config.item ?? '',
        maxHP:pokemon.maxHP(),
        currentHP:config.curHP ??
            pokemon.curHP(),
        status:config.status || null,
        boosts:normalizeBoosts(config.boosts),
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
        item:state.item,
        curHP:state.currentHP,
        status:state.status || '',
        boosts:{...state.boosts},
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
    const move=dex.moves.get(name);

    if (!move.exists || move.gen>4) {
        throw new Error('Unknown move: '+name);
    }

    if (move.category==='Status') {
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
    } else if (!isSimpleAttack(move)) {
        throw new Error(
            'Unsupported attack: '+name
        );
    }

    return move;
}

function executeMove({
    actor,target,move,field,
    conditions,damageCalculator
}) {
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

    const damage=damageCalculator({
        attacker:toConfig(actor),
        defender:toConfig(target),
        move:move.name,
        field
    });

    if (!damage.rolls) {
        throw new Error(
            'Unsupported damage distribution'
        );
    }

    const accuracy=move.accuracy===true
        ? 1 : move.accuracy/100;

    return damageDistribution(
        damage.rolls,accuracy
    ).map(o=>({
        actor,
        target:{
            ...target,
            currentHP:Math.max(
                0,target.currentHP-o.damage
            )
        },
        probability:o.probability
    }));
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

function resolveAction(input) {
    const {actor,target,move}=input;

    if (actor.currentHP===0 ||
        target.currentHP===0) {
        return [{
            actor,target,probability:1
        }];
    }

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

        if (!branch.canAct) {
            outcomes.push({
                actor:nextActor,
                target,
                probability:branch.probability
            });
            continue;
        }

        for (const result of executeMove({
            ...input,
            actor:nextActor
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
        state.currentHP,
        state.status,
        state.item,
        state.boosts,
        state.toxicCounter,
        state.sleepState
    ];
}

function predictFullTurnV06({
    own,
    enemy,
    ownMove,
    enemyMove,
    ownMoves=[],
    enemyMoves=[],
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

    const attack=supportedMove(
        ownMove,initialOwn
    );

    const counter=supportedMove(
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
            field:ownFirst
                ? attackField : defenseField,
            conditions:ownFirst
                ? attackConditions
                : defenseConditions,
            damageCalculator
        });

        for (const a of first) {
            const second=resolveAction({
                actor:a.target,
                target:a.actor,
                move:ownFirst ? counter : attack,
                field:ownFirst
                    ? defenseField : attackField,
                conditions:ownFirst
                    ? defenseConditions
                    : attackConditions,
                damageCalculator
            });

            for (const b of second) {
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
                    finalOwn=branch.own;
                    finalEnemy=branch.enemy;

                const probability=
                    orderProbability*
                    a.probability*
                    b.probability*
                    branch.probability;

                if (!probability) continue;

                const key=JSON.stringify([
                    stateKey(finalOwn),
                    stateKey(finalEnemy)
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
                        value:value(finalOwn)-
                            value(finalEnemy),
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
        initialValue:
            value(initialOwn)-value(initialEnemy),
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

module.exports={predictFullTurnV06};