const assert = require('node:assert/strict');

const {
    CalculationCache
} = require('../src/calculation_cache');

const {
    CachedCalculations
} = require('../src/cached_calculations');

const {
    predictDamage
} = require('../src/damage');

const {
    effectiveSpeed
} = require('../src/speed');

const cache = new CalculationCache(2);

assert.equal(cache.getOrCompute('A', () => 1), 1);
assert.equal(cache.getOrCompute('B', () => 2), 2);
assert.equal(cache.getOrCompute('A', () => 99), 1);
assert.equal(cache.getOrCompute('C', () => 3), 3);

assert.equal(cache.entries.size, 2);
assert.equal(cache.evictions, 1);
assert.equal(cache.hits, 1);

assert.equal(cache.getOrCompute('B', () => 4), 4);

console.log('LRU eviction: PASS');

const cached = new CachedCalculations();

const attacker = {
    species: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    evs: {atk:252,spe:252},
    ability: 'Sand Veil'
};

const defender = {
    species: 'Suicune',
    level: 50,
    nature: 'Bold',
    evs: {hp:252,def:252},
    ability: 'Pressure'
};

const cases = [
    {
        attacker,
        defender,
        move: 'Earthquake'
    },
    {
        attacker,
        defender: {...defender,curHP:80},
        move: 'Earthquake'
    },
    {
        attacker: {...attacker,boosts:{atk:2}},
        defender,
        move: 'Earthquake'
    },
    {
        attacker: {...attacker,item:'Choice Band'},
        defender,
        move: 'Earthquake'
    },
    {
        attacker,
        defender,
        move: 'Earthquake',
        field: {
            defenderSide: {isReflect:true}
        }
    },
    {
        attacker: defender,
        defender: attacker,
        move: 'Surf',
        field: {weather:'Rain'}
    },
    {
        attacker: defender,
        defender: attacker,
        move: 'Surf',
        field: {weather:'Sun'}
    }
];

const expected = cases.map(predictDamage);

let checks = 0;

for (let i = 0; i < 100; i++) {
    for (let j = 0; j < cases.length; j++) {
        assert.deepEqual(
            cached.predictDamage(cases[j]),
            expected[j]
        );

        checks++;
    }
}

console.log('Damage equality checks:', checks);

const speedCases = [
    attacker,
    defender,
    {...attacker,item:'Choice Scarf'},
    {...attacker,status:'par'},
    {...attacker,boosts:{spe:2}},
    {...attacker,boosts:{spe:-1}}
];

for (let i = 0; i < 100; i++) {
    for (const config of speedCases) {
        assert.equal(
            cached.effectiveSpeed(config),
            effectiveSpeed(config)
        );
    }
}

console.log('Speed equality checks:', 600);

const damaged = cached.predictDamage(cases[0]);

damaged.rolls[0] = -999;

assert.deepEqual(
    cached.predictDamage(cases[0]),
    expected[0]
);

console.log('Cached data protection: PASS');

const stats = cached.stats();

assert.equal(stats.damage.misses, cases.length);
assert.equal(stats.speed.misses, speedCases.length);

console.log('\n=== CACHE STATISTICS ===');
console.table(stats);

const iterations = 20000;

let started = performance.now();

for (let i = 0; i < iterations; i++) {
    predictDamage(cases[i % cases.length]);
}

const normalMs = performance.now() - started;

started = performance.now();

for (let i = 0; i < iterations; i++) {
    cached.predictDamage(cases[i % cases.length]);
}

const cachedMs = performance.now() - started;

console.log('\n=== MICRO BENCHMARK ===');

console.table({
    Iterations: iterations,
    NormalMs: normalMs.toFixed(2),
    CachedMs: cachedMs.toFixed(2),
    Speedup: (normalMs / cachedMs).toFixed(2) + 'x',
    Reduction: (
        (1 - cachedMs / normalMs) * 100
    ).toFixed(2) + '%'
});

cached.clear();

assert.equal(cached.stats().damage.size, 0);
assert.equal(cached.stats().speed.size, 0);

console.log('Cache reset: PASS');

console.log('\nCALCULATION CACHE TEST: PASS');
