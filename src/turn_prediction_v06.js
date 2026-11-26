const {Dex}=require('pokemon-showdown');
const {Pokemon,Generations}=require('@smogon/calc');

const {predictDamage}=require('./damage');
const {predictOrder}=require('./speed');
const {damageDistribution}=require('./attack_turn');
const {isSimpleAttack}=require('./move_candidates');

const {
    getStatusMoveEffect,
    predictStatusMove
}=require('./status_move_effects');

const {
    evaluatePokemonV06
}=require('./board_value_v06');

const {
    normalizeBoosts
}=require('./boost_value');

const dex=Dex.mod('gen4');
const gen=Generations.get(4);

function createState(config,moves=[]) {
    const {species,...options}=config;

    const pokemon=new Pokemon(gen,species,{
        level:50,
        ...options
    });

    const attacks=moves
        .map(name=>dex.moves.get(name))
        .filter(move=>move.category!=='Status');

    return {
        config:structuredClone(config),
        species,
        maxHP:pokemon.maxHP(),
        currentHP:pokemon.curHP(),
        status:config.status || null,
        boosts:normalizeBoosts(config.boosts),
        attackProfile:moves.length
            ? {
                physical:attacks.some(
                    m=>m.category==='Physical'
                ),
                special:attacks.some(
                    m=>m.category==='Special'
                )
            }
            : {
                physical:true,
                special:true
            }
    };
}

function toConfig(state) {
    return {
        ...state.config,
        curHP:state.currentHP,
        status:state.status || '',
        boosts:{...state.boosts}
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

function resolveAction({
    actor,
    target,
    move,
    field,
    damageCalculator
}) {
    if (actor.currentHP===0 ||
        target.currentHP===0) {
        return [{
            actor,
            target,
            probability:1
        }];
    }

    if (move.category==='Status') {
        const result=predictStatusMove(
            actor,move.name
        );

        return [{
            actor:result.after,
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
        ? 1
        : move.accuracy/100;

    return damageDistribution(
        damage.rolls,accuracy
    ).map(outcome=>({
        actor,
        target:{
            ...target,
            currentHP:Math.max(
                0,
                target.currentHP-outcome.damage
            )
        },
        probability:outcome.probability
    }));
}

function predictTurnV06({
    own,
    enemy,
    ownMove,
    enemyMove,
    ownMoves=[],
    enemyMoves=[],
    attackField={},
    defenseField={},
    trickRoom=false,
    damageCalculator=predictDamage,
    orderCalculator=predictOrder
}) {
    const initialOwn=createState(
        own,ownMoves
    );

    const initialEnemy=createState(
        enemy,enemyMoves
    );

    if (initialOwn.currentHP<=0 ||
        initialEnemy.currentHP<=0) {
        throw new Error('Invalid active HP');
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
            damageCalculator
        });

        for (const a of first) {
            const second=resolveAction({
                actor:a.target,
                target:a.actor,
                move:ownFirst ? counter : attack,
                field:ownFirst
                    ? defenseField : attackField,
                damageCalculator
            });

            for (const b of second) {
                const finalOwn=ownFirst
                    ? b.target : b.actor;

                const finalEnemy=ownFirst
                    ? b.actor : b.target;

                const probability=
                    orderProbability*
                    a.probability*
                    b.probability;

                const key=JSON.stringify([
                    finalOwn.currentHP,
                    finalEnemy.currentHP,
                    finalOwn.boosts,
                    finalEnemy.boosts,
                    finalOwn.status,
                    finalEnemy.status
                ]);

                const existing=outcomes.get(key);

                if (existing) {
                    existing.probability+=probability;
                } else {
                    outcomes.set(key,{
                        ownHP:finalOwn.currentHP,
                        enemyHP:finalEnemy.currentHP,
                        ownBoosts:finalOwn.boosts,
                        enemyBoosts:finalEnemy.boosts,
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

    result.expectedChange=
        result.expectedValue-result.initialValue;

    return result;
}

module.exports={predictTurnV06};