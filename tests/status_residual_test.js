const assert=require('node:assert/strict');

const {
    predictStatusResidual
}=require('../src/status_residual');

const base={
    currentHP:160,
    maxHP:160,
    ability:'Pressure'
};

const burn=predictStatusResidual({
    ...base,status:'brn'
});

assert.equal(burn.damage,20);
assert.equal(burn.afterHP,140);

const poison=predictStatusResidual({
    ...base,status:'psn'
});

assert.equal(poison.damage,20);

console.log('Generation IV burn and poison: PASS');

let hp=160;
let counter=0;
const history=[];

for (let turn=1;turn<=5;turn++) {
    const result=predictStatusResidual({
        ...base,
        currentHP:hp,
        status:'tox',
        toxicCounter:counter
    });

    assert.equal(result.damage,turn*10);

    hp=result.afterHP;
    counter=result.toxicCounter;

    history.push({
        turn,
        damage:result.damage,
        remainingHP:hp,
        toxicCounter:counter
    });
}

assert.equal(hp,10);

console.log('Toxic progression: PASS');

const capped=predictStatusResidual({
    ...base,
    status:'tox',
    toxicCounter:15
});

assert.equal(capped.toxicCounter,15);
assert.equal(capped.damage,150);

console.log('Toxic counter limit: PASS');

for (const status of ['brn','psn','tox']) {
    const result=predictStatusResidual({
        ...base,
        status,
        ability:'Magic Guard'
    });

    assert.equal(result.damage,0);
    assert.equal(result.afterHP,160);
}

console.log('Magic Guard: PASS');

const heatproof=predictStatusResidual({
    ...base,
    status:'brn',
    ability:'Heatproof'
});

assert.equal(heatproof.damage,10);

console.log('Heatproof: PASS');

for (const status of ['psn','tox']) {
    const result=predictStatusResidual({
        ...base,
        currentHP:80,
        status,
        ability:'Poison Heal'
    });

    assert.equal(result.damage,0);
    assert.equal(result.healing,20);
    assert.equal(result.afterHP,100);
}

console.log('Poison Heal: PASS');

for (const status of [
    null,'par','slp','frz'
]) {
    const result=predictStatusResidual({
        ...base,status
    });

    assert.equal(result.afterHP,160);
}

console.log('Non-damaging statuses: PASS');

const ko=predictStatusResidual({
    ...base,
    currentHP:5,
    status:'brn'
});

assert.equal(ko.afterHP,0);
assert.equal(ko.damage,5);
assert.equal(ko.fainted,true);

const fainted=predictStatusResidual({
    ...base,
    currentHP:0,
    status:'psn',
    ability:'Poison Heal'
});

assert.equal(fainted.afterHP,0);

const minimum=predictStatusResidual({
    currentHP:5,
    maxHP:5,
    status:'brn'
});

assert.equal(minimum.damage,1);

console.log('HP limits and fainted protection: PASS');

console.log('\n=== TOXIC PROGRESSION ===');
console.table(history);

console.log('STATUS RESIDUAL TEST: PASS');