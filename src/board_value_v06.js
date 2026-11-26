const {
    DEFAULT_WEIGHTS,
    evaluatePokemon
}=require('./board_value');

const {
    DEFAULT_BOOST_WEIGHTS,
    evaluateBoosts
}=require('./boost_value');

function evaluatePokemonV06(
    pokemon,
    weights=DEFAULT_WEIGHTS,
    boostWeights=DEFAULT_BOOST_WEIGHTS
) {
    const base=evaluatePokemon(
        pokemon,weights
    );

    const boost=evaluateBoosts(
        pokemon,boostWeights
    );

    return {
        base,
        boost,
        value:Math.max(0,base+boost)
    };
}

function evaluateTeamV06(
    team,
    weights,
    boostWeights
) {
    const members=team.map(pokemon=>({
        species:pokemon.species,
        ...evaluatePokemonV06(
            pokemon,weights,boostWeights
        )
    }));

    return {
        alive:team.filter(
            p=>!p.fainted && p.hpRatio>0
        ).length,
        value:members.reduce(
            (sum,p)=>sum+p.value,0
        ),
        members
    };
}

function evaluateBoardV06({
    own,
    enemy,
    weights=DEFAULT_WEIGHTS,
    boostWeights=DEFAULT_BOOST_WEIGHTS
}) {
    const ownValue=evaluateTeamV06(
        own,weights,boostWeights
    );

    const enemyValue=evaluateTeamV06(
        enemy,weights,boostWeights
    );

    return {
        own:ownValue,
        enemy:enemyValue,
        advantage:ownValue.value-enemyValue.value
    };
}

module.exports={
    evaluatePokemonV06,
    evaluateTeamV06,
    evaluateBoardV06
};