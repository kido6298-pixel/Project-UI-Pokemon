const assert=require('node:assert/strict');
const {Pokemon,Generations}=require('@smogon/calc');

const {
    predictFullTurnV06:predict
}=require('../src/turn_prediction_v06_full');

const {
    predictIntegratedTurnV06:previous
}=require('../src/turn_prediction_v06_integrated');

const gen=Generations.get(4);

const own={
    species:'Suicune',
    level:50,
    ability:'Pressure',
    nature:'Hardy',
    curHP:100
};

const enemy={
    species:'Starmie',
    level:50,
    ability:'Natural Cure',
    nature:'Hardy',
    curHP:100
};

const base={
    own,
    enemy,
    ownMove:'Surf',
    enemyMove:'Surf',
    orderCalculator:()=>({firstChance:1}),
    damageCalculator:()=>({rolls:[40]})
};

function close(a,b) {
    assert.ok(
        Math.abs(a-b)<1e-8,
        `${a} != ${b}`
    );
}

function maxHP(config) {
    const {species,...options}=config;
    return new Pokemon(gen,species,options).maxHP();
}

function run(changes={}) {
    const result=predict({...base,...changes});
    close(result.probabilitySum,1);
    return result;
}

const neutral=run();
const old=previous(base);

for (const key of [
    'expectedOwnHP',
    'expectedEnemyHP',
    'expectedValue',
    'expectedChange',
    'ownKOChance',
    'enemyKOChance'
]) {
    close(neutral[key],old[key]);
}

console.log('Previous version compatibility: PASS');

const heal=Math.floor(maxHP(own)/16);

const leftovers=run({
    own:{...own,item:'Leftovers'}
});

close(leftovers.expectedOwnHP,60+heal);

const sand=run({
    own:{...own,item:'Leftovers'},
    weather:'sandstorm'
});

close(sand.expectedOwnHP,60);

console.log('Weather and held items: PASS');

const lum=run({
    ownMove:'Spore',
    enemy:{...enemy,item:'Lum Berry'}
});

close(lum.expectedOwnHP,60);
assert.equal(lum.outcomes[0].enemyStatus,null);
assert.equal(lum.outcomes[0].enemyItem,'');
assert.equal(lum.outcomes[0].enemyConfig.item,'');

const lumNext=run({
    own:lum.outcomes[0].ownConfig,
    enemy:lum.outcomes[0].enemyConfig,
    ownMove:'Spore'
});

close(lumNext.expectedOwnHP,60);
assert.equal(lumNext.outcomes[0].enemyStatus,'slp');

console.log('Immediate Lum Berry and consumption: PASS');

const chesto=run({
    ownMove:'Spore',
    enemy:{...enemy,item:'Chesto Berry'}
});

close(chesto.expectedOwnHP,60);
assert.equal(chesto.outcomes[0].enemyStatus,null);
assert.equal(chesto.outcomes[0].enemyItem,'');

const chestoPar=run({
    ownMove:'Thunder Wave',
    enemy:{...enemy,item:'Chesto Berry'}
});

close(chestoPar.expectedOwnHP,70);

assert.ok(
    chestoPar.outcomes.every(
        o=>o.enemyItem==='Chesto Berry'
    )
);

console.log('Chesto Berry specificity: PASS');

const lumBurn=run({
    ownMove:'Will-O-Wisp',
    enemy:{...enemy,item:'Lum Berry'}
});

assert.equal(lumBurn.outcomes.length,2);

const consumed=lumBurn.outcomes.find(
    o=>o.enemyItem===''
);

const retained=lumBurn.outcomes.find(
    o=>o.enemyItem==='Lum Berry'
);

close(consumed.probability,0.75);
close(retained.probability,0.25);
close(consumed.enemyHP,retained.enemyHP);
assert.equal(consumed.enemyStatus,null);
assert.equal(retained.enemyStatus,null);

console.log('Item-aware outcome separation: PASS');

const orb=run({
    own:{...own,item:'Toxic Orb'}
});

close(orb.expectedOwnHP,60);
assert.equal(orb.outcomes[0].ownStatus,'tox');
assert.equal(orb.outcomes[0].ownConfig.toxicCounter,0);

const orbNext=run({
    own:orb.outcomes[0].ownConfig,
    enemy:orb.outcomes[0].enemyConfig,
    damageCalculator:()=>({rolls:[0]})
});

close(orbNext.expectedOwnHP,60-heal);
assert.equal(
    orbNext.outcomes[0].ownConfig.toxicCounter,1
);

console.log('Orb state continuation: PASS');

const shed=run({
    own:{...own,ability:'Shed Skin',status:'brn'},
    enemy:{...enemy,ability:'Shed Skin',status:'brn'}
});

assert.equal(shed.outcomes.length,4);

close(
    shed.outcomes.find(
        o=>!o.ownStatus&&!o.enemyStatus
    ).probability,
    0.33*0.33
);

close(
    shed.expectedOwnHP,
    60-0.67*Math.floor(maxHP(own)/8)
);

console.log('Combined probability branching: PASS');

const suppressed=run({
    own:{...own,ability:'Cloud Nine'},
    weather:'sandstorm'
});

close(suppressed.expectedOwnHP,60);
close(suppressed.expectedEnemyHP,60);

console.log('Shared weather suppression: PASS');

const weatherKO=run({
    own:{...own,curHP:45,item:'Leftovers'},
    weather:'sandstorm'
});

close(weatherKO.ownKOChance,1);
close(weatherKO.expectedOwnHP,0);

console.log('Weather KO before recovery: PASS');

const noResidual=run({
    own:{...own,item:'Leftovers'},
    residual:false
});

close(noResidual.expectedOwnHP,60);

const immediateOnly=run({
    ownMove:'Spore',
    enemy:{...enemy,item:'Lum Berry'},
    residual:false
});

close(immediateOnly.expectedOwnHP,60);
assert.equal(immediateOnly.outcomes[0].enemyItem,'');

console.log('Residual toggle: PASS');

assert.equal(own.item,undefined);
assert.equal(enemy.curHP,100);

console.log('Input protection: PASS');

console.log('\n=== FULL TURN RESULTS ===');

console.table([
    ['Neutral',neutral],
    ['Leftovers',leftovers],
    ['Sand + Leftovers',sand],
    ['Spore + Lum Berry',lum],
    ['Spore after Lum Berry',lumNext],
    ['Will-O-Wisp + Lum Berry',lumBurn],
    ['Toxic Orb first',orb],
    ['Toxic Orb next',orbNext],
    ['Double Shed Skin',shed],
    ['Weather suppression',suppressed],
    ['Weather KO',weatherKO]
].map(([scenario,r])=>({
    scenario,
    ownHP:Number(r.expectedOwnHP.toFixed(4)),
    enemyHP:Number(r.expectedEnemyHP.toFixed(4)),
    valueChange:Number(r.expectedChange.toFixed(4)),
    outcomes:r.outcomes.length,
    probability:Number(r.probabilitySum.toFixed(8))
})));

console.log('FULL TURN V06 TEST: PASS');