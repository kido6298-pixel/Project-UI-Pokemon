const assert=require('node:assert/strict');

const {
    predictControlTurnV06:predict
}=require('../src/turn_prediction_v06_control');

const {
    predictFieldTurnV06:previous
}=require('../src/turn_prediction_v06_field');

const {
    normalizeScreens
}=require('../src/screen_control_v06');

const own={
    species:'Metagross',
    level:50,
    nature:'Hardy',
    ability:'Clear Body',
    curHP:100
};

const enemy={
    species:'Starmie',
    level:50,
    nature:'Hardy',
    ability:'Natural Cure',
    curHP:100
};

const base={
    own,enemy,
    ownMove:'Earthquake',
    enemyMove:'Surf',
    residual:false,
    orderCalculator:()=>({firstChance:1}),
    damageCalculator:({move,field})=>{
        const physical=[
            'Earthquake','Brick Break','Rapid Spin'
        ].includes(move);

        const reduced=physical
            ? field.defenderSide?.isReflect
            : field.defenderSide?.isLightScreen;

        return {rolls:[reduced?20:40]};
    }
};

function run(changes={}) {
    const result=predict({...base,...changes});

    assert.ok(
        Math.abs(result.probabilitySum-1)<1e-8
    );

    return result;
}

const neutral=run();

assert.equal(
    neutral.expectedValue,
    previous(base).expectedValue
);

console.log('Previous predictor compatibility: PASS');

const light=run({
    ownMove:'Light Screen'
});

assert.equal(light.expectedOwnHP,80);

assert.equal(
    normalizeScreens(
        light.outcomes[0].ownConditions
    )['Light Screen'],5
);

console.log('Light Screen before attack: PASS');

const late=run({
    ownMove:'Light Screen',
    orderCalculator:()=>({firstChance:0})
});

assert.equal(late.expectedOwnHP,60);

console.log('Light Screen after attack: PASS');

const reflect=run({
    ownMove:'Reflect',
    enemyMove:'Earthquake'
});

assert.equal(reflect.expectedOwnHP,80);

const wrongCategory=run({
    ownMove:'Reflect',
    enemyMove:'Surf'
});

assert.equal(wrongCategory.expectedOwnHP,60);

console.log('Physical and special separation: PASS');

const clay=run({
    own:{...own,item:'Light Clay'},
    ownMove:'Light Screen'
});

assert.equal(
    normalizeScreens(
        clay.outcomes[0].ownConditions
    )['Light Screen'],8
);

console.log('Light Clay integration: PASS');

const duration=run({
    ownMove:'Light Screen',
    residual:true
});

assert.equal(
    normalizeScreens(
        duration.outcomes[0].ownConditions
    )['Light Screen'],4
);

console.log('Screen duration tick: PASS');

const expired=run({
    ownConditions:{'Light Screen':1},
    residual:true
});

assert.equal(expired.expectedOwnHP,80);

assert.ok(
    !normalizeScreens(
        expired.outcomes[0].ownConditions
    )['Light Screen']
);

console.log('Screen expiration after action: PASS');

const brick=run({
    ownMove:'Brick Break',
    enemyConditions:{
        Reflect:5,
        'Light Screen':5,
        Spikes:2
    }
});

assert.equal(brick.expectedEnemyHP,60);

assert.ok(
    !normalizeScreens(
        brick.outcomes[0].enemyConditions
    )['Reflect']
);

assert.ok(
    !normalizeScreens(
        brick.outcomes[0].enemyConditions
    )['Light Screen']
);

assert.equal(
    brick.outcomes[0].enemyConditions.Spikes,2
);

console.log('Brick Break before damage: PASS');

const hazards={
    'Stealth Rock':1,
    Spikes:3,
    'Toxic Spikes':2
};

const spin=run({
    ownMove:'Rapid Spin',
    ownConditions:hazards
});

assert.deepEqual(
    spin.outcomes[0].ownConditions,{}
);

console.log('Rapid Spin removal: PASS');

const immune=run({
    ownMove:'Rapid Spin',
    ownConditions:hazards,
    damageCalculator:({move})=>({
        rolls:[move==='Rapid Spin'?0:40]
    })
});

assert.deepEqual(
    immune.outcomes[0].ownConditions,
    hazards
);

console.log('Rapid Spin immunity: PASS');

const blocked=run({
    ownMove:'Rapid Spin',
    ownConditions:hazards,
    attackConditions:{protect:true}
});

assert.deepEqual(
    blocked.outcomes[0].ownConditions,
    hazards
);

console.log('Protect prevents removal: PASS');

assert.equal(hazards.Spikes,3);

console.log('Input protection: PASS');

console.table([
    ['Neutral',neutral],
    ['Light Screen first',light],
    ['Light Screen second',late],
    ['Reflect',reflect],
    ['Brick Break',brick],
    ['Rapid Spin',spin]
].map(([scenario,r])=>({
    scenario,
    ownHP:r.expectedOwnHP,
    enemyHP:r.expectedEnemyHP,
    outcomes:r.outcomes.length,
    probability:r.probabilitySum
})));

console.log('CONTROL TURN V06 TEST: PASS');