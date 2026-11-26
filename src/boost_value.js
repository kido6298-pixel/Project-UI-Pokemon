const STATS=[
    'atk','def','spa','spd','spe',
    'accuracy','evasion'
];

const DEFAULT_BOOST_WEIGHTS=Object.freeze({
    atk:0.18,
    def:0.16,
    spa:0.18,
    spd:0.16,
    spe:0.20,
    accuracy:0.08,
    evasion:0.08
});

function normalizeBoosts(boosts={}) {
    return Object.fromEntries(
        STATS.map(stat=>{
            const value=boosts[stat] ?? 0;

            if (!Number.isInteger(value)) {
                throw new Error('Invalid boost: '+stat);
            }

            return [
                stat,
                Math.max(-6,Math.min(6,value))
            ];
        })
    );
}

function stageMultiplier(stat,stage) {
    if (!STATS.includes(stat)) {
        throw new Error('Unknown stat');
    }

    if (!Number.isInteger(stage) ||
        stage < -6 || stage > 6) {
        throw new Error('Invalid stage');
    }

    const base=
        stat==='accuracy' || stat==='evasion'
            ? 3
            : 2;

    return stage>=0
        ? (base+stage)/base
        : base/(base-stage);
}

function applyBoosts(current={},changes={}) {
    const result=normalizeBoosts(current);

    for (const [stat,change] of
        Object.entries(changes)) {

        if (!STATS.includes(stat) ||
            !Number.isInteger(change)) {
            throw new Error('Invalid boost change');
        }

        result[stat]=Math.max(
            -6,
            Math.min(6,result[stat]+change)
        );
    }

    return result;
}

function evaluateBoosts(
    pokemon,
    weights=DEFAULT_BOOST_WEIGHTS
) {
    if (pokemon.fainted ||
        pokemon.hpRatio<=0 ||
        pokemon.active===false) {
        return 0;
    }

    const boosts=normalizeBoosts(
        pokemon.boosts
    );

    const profile=pokemon.attackProfile ?? {
        physical:true,
        special:true
    };

    let value=0;

    for (const stat of STATS) {
        if (stat==='atk' &&
            profile.physical===false) continue;

        if (stat==='spa' &&
            profile.special===false) continue;

        const weight=weights[stat] ?? 0;

        value+=weight*Math.log2(
            stageMultiplier(stat,boosts[stat])
        );
    }

    const hp=Math.max(
        0,Math.min(1,pokemon.hpRatio ?? 1)
    );

    return value*Math.sqrt(hp);
}

module.exports={
    STATS,
    DEFAULT_BOOST_WEIGHTS,
    normalizeBoosts,
    stageMultiplier,
    applyBoosts,
    evaluateBoosts
};