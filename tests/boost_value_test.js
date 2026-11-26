const assert=require('node:assert/strict');

const {
    STATS,
    stageMultiplier,
    normalizeBoosts,
    applyBoosts,
    evaluateBoosts
}=require('../src/boost_value');

const {
    evaluatePokemon
}=require('../src/board_value');

const {
    evaluatePokemonV06,
    evaluateBoardV06
}=require('../src/board_value_v06');

const base={
    species:'Suicune',
    hpRatio:1,
    status:null,
    fainted:false,
    active:true,
    attackProfile:{
        physical:false,
        special:true
    },
    boosts:{}
};

for (const stat of STATS) {
    assert.equal(stageMultiplier(stat,0),1);

    for (let stage=1;stage<=6;stage++) {
        assert.ok(Math.abs(
            stageMultiplier(stat,stage)*
            stageMultiplier(stat,-stage)-1
        )<1e-12);
    }
}

assert.equal(stageMultiplier('atk',2),2);
assert.equal(stageMultiplier('def',-2),0.5);
assert.equal(stageMultiplier('spe',6),4);
assert.equal(stageMultiplier('accuracy',3),2);

console.log('Generation IV stage multipliers: PASS');

assert.equal(
    applyBoosts({spa:5},{spa:2}).spa,
    6
);

assert.equal(
    applyBoosts({atk:-5},{atk:-2}).atk,
    -6
);

assert.equal(
    Object.keys(normalizeBoosts()).length,
    7
);

console.log('Stage limits: PASS');

assert.equal(
    evaluatePokemonV06(base).value,
    evaluatePokemon(base)
);

console.log('Neutral evaluation compatibility: PASS');

const calmMind={
    ...base,
    boosts:{spa:1,spd:1}
};

const calmMind2={
    ...base,
    boosts:{spa:2,spd:2}
};

assert.ok(
    evaluateBoosts(calmMind)>
    evaluateBoosts(base)
);

assert.ok(
    evaluateBoosts(calmMind2)>
    evaluateBoosts(calmMind)
);

assert.equal(
    evaluateBoosts({
        ...base,
        boosts:{atk:6}
    }),
    0
);

assert.ok(
    evaluateBoosts({
        ...base,
        boosts:{spd:-2}
    })<0
);

console.log('Relevant stat evaluation: PASS');

assert.equal(
    evaluateBoosts({
        ...calmMind,
        active:false
    }),
    0
);

assert.equal(
    evaluateBoosts({
        ...calmMind,
        fainted:true,
        hpRatio:0
    }),
    0
);

assert.ok(
    evaluateBoosts({
        ...calmMind,
        hpRatio:0.25
    })<
    evaluateBoosts(calmMind)
);

console.log('HP and active-state adjustment: PASS');

const ownAdvantage=evaluateBoardV06({
    own:[calmMind],
    enemy:[base]
}).advantage;

const enemyAdvantage=evaluateBoardV06({
    own:[base],
    enemy:[calmMind]
}).advantage;

assert.ok(ownAdvantage>0);
assert.ok(enemyAdvantage<0);

assert.ok(
    Math.abs(ownAdvantage+enemyAdvantage)
    <1e-12
);

console.log('Board symmetry: PASS');

console.log('\n=== CALM MIND EVALUATION ===');

console.table(
    Array.from({length:7},(_,stage)=>{
        const p={
            ...base,
            boosts:{spa:stage,spd:stage}
        };

        return {
            stage,
            multiplier:stageMultiplier('spa',stage),
            boostValue:Number(
                evaluateBoosts(p).toFixed(4)
            ),
            boardValue:Number(
                evaluatePokemonV06(p).value.toFixed(4)
            )
        };
    })
);

console.log('BOOST VALUE TEST: PASS');