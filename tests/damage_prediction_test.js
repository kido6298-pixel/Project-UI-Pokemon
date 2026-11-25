const assert = require('node:assert/strict');
const {
    predictDamage,
    predictScenarios
} = require('../src/damage');

const attacker = {
    species: 'Garchomp',
    nature: 'Jolly',
    ability: 'Sand Veil',
    evs: {atk: 252, spe: 252, hp: 4}
};

const defender = {
    species: 'Suicune',
    ability: 'Pressure'
};

const results = predictScenarios({
    attacker,
    defender,
    move: 'Earthquake',
    scenarios: [
        {
            name: 'Uninvested',
            options: {
                nature: 'Hardy',
                evs: {}
            }
        },
        {
            name: 'HP invested',
            options: {
                nature: 'Hardy',
                evs: {hp: 252}
            }
        },
        {
            name: 'Physical defensive',
            options: {
                nature: 'Bold',
                evs: {hp: 252, def: 252}
            }
        }
    ]
});

console.log('\n=== DAMAGE SCENARIOS ===');

console.table(results.map(r => ({
    scenario: r.name,
    HP: r.maxHP,
    min: r.min,
    max: r.max,
    average: r.average.toFixed(1),
    minPercent: r.minPercent.toFixed(1),
    maxPercent: r.maxPercent.toFixed(1),
    koChance: (r.koChance * 100).toFixed(1) + '%'
})));

assert.ok(results[0].minPercent > results[1].minPercent);
assert.ok(results[1].minPercent > results[2].minPercent);

assert.equal(results[2].min, 57);
assert.equal(results[2].max, 67);

const immune = predictDamage({
    attacker,
    defender: {species: 'Zapdos'},
    move: 'Earthquake'
});

assert.equal(immune.max, 0);
assert.equal(immune.koChance, 0);
assert.equal(immune.immune, true);

console.log('Zero damage: PASS');

const ko = predictDamage({
    attacker,
    defender: {
        species: 'Heatran',
        ability: 'Flash Fire'
    },
    move: 'Earthquake'
});

assert.equal(ko.koChance, 1);

console.log('Guaranteed KO: PASS');

const boosted = predictDamage({
    attacker: {
        ...attacker,
        boosts: {atk: 2}
    },
    defender: {
        ...defender,
        nature: 'Bold',
        evs: {hp: 252, def: 252}
    },
    move: 'Earthquake'
});

assert.equal(boosted.min, 112);
assert.equal(boosted.max, 133);

console.log('Boosted damage: PASS');

console.log('\nDAMAGE PREDICTION TEST: PASS');
