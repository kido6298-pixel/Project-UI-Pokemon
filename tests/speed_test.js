const assert = require('node:assert/strict');

const {
    effectiveSpeed,
    predictOrder,
    predictOrderScenarios
} = require('../src/speed');

const garchomp = {
    species: 'Garchomp',
    nature: 'Jolly',
    evs: {spe: 252}
};

const zapdos = {
    species: 'Zapdos',
    nature: 'Timid',
    evs: {spe: 252}
};

assert.equal(effectiveSpeed(garchomp), 169);
assert.equal(effectiveSpeed(zapdos), 167);

console.log('Base speed: PASS');

assert.equal(effectiveSpeed({
    ...garchomp,
    item: 'Choice Scarf'
}), 253);

console.log('Choice Scarf: PASS');

assert.equal(effectiveSpeed({
    ...garchomp,
    status: 'par'
}), 42);

console.log('Gen 4 paralysis: PASS');

assert.equal(effectiveSpeed({
    ...garchomp,
    boosts: {spe: 1}
}), 253);

console.log('Speed boosts: PASS');

assert.equal(predictOrder({
    attacker: garchomp,
    defender: zapdos
}).firstChance, 1);

assert.equal(predictOrder({
    attacker: garchomp,
    defender: garchomp
}).firstChance, 0.5);

console.log('Normal order and speed tie: PASS');

assert.equal(predictOrder({
    attacker: garchomp,
    defender: zapdos,
    trickRoom: true
}).firstChance, 0);

console.log('Trick Room: PASS');

assert.equal(predictOrder({
    attacker: garchomp,
    defender: zapdos,
    defenderPriority: 1
}).firstChance, 0);

console.log('Move priority: PASS');

const results = predictOrderScenarios({
    attacker: garchomp,
    defender: {species: 'Zapdos'},
    scenarios: [
        {
            name: 'Uninvested',
            options: {
                nature: 'Hardy',
                evs: {}
            }
        },
        {
            name: 'Max speed',
            options: {
                nature: 'Timid',
                evs: {spe: 252}
            }
        },
        {
            name: 'Choice Scarf',
            options: {
                nature: 'Timid',
                evs: {spe: 252},
                item: 'Choice Scarf'
            }
        }
    ]
});

console.log('\n=== SPEED SCENARIOS ===');
console.table(results);

assert.equal(results[0].firstChance, 1);
assert.equal(results[1].firstChance, 1);
assert.equal(results[2].firstChance, 0);

console.log('\nSPEED PREDICTION TEST: PASS');
