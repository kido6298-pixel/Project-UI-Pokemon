const assert = require('node:assert/strict');

const {
    CalculationCache
} = require('../src/calculation_cache');

const {
    FastCalculationCache,
    cloneCalculation
} = require('../src/fast_calculation_cache');

const {
    predictDamage
} = require('../src/damage');

const attacker = {
    species:'Garchomp',
    level:50,
    nature:'Jolly',
    ability:'Sand Veil',
    evs:{atk:252,spe:252}
};

const defender = {
    species:'Suicune',
    level:50,
    nature:'Bold',
    ability:'Pressure',
    evs:{hp:252,def:252}
};

const cases = [
    {
        attacker,
        defender,
        move:'Earthquake'
    },
    {
        attacker,
        defender:{...defender,curHP:60},
        move:'Earthquake'
    },
    {
        attacker:{...attacker,boosts:{atk:2}},
        defender,
        move:'Earthquake'
    },
    {
        attacker:{...attacker,item:'Choice Band'},
        defender,
        move:'Earthquake'
    },
    {
        attacker,
        defender,
        move:'Earthquake',
        field:{defenderSide:{isReflect:true}}
    },
    {
        attacker,
        defender:{
            species:'Zapdos',
            level:50,
            ability:'Pressure'
        },
        move:'Earthquake'
    }
];

const expected = cases.map(predictDamage);

const original = new CalculationCache();
const fast = new FastCalculationCache();

let checks = 0;

for (let i = 0; i < 1000; i++) {
    for (let j = 0; j < cases.length; j++) {
        const options = cases[j];

        const a = original.getOrCompute(
            options,
            () => predictDamage(options)
        );

        const b = fast.getOrCompute(
            options,
            () => predictDamage(options)
        );

        assert.deepEqual(a,b);
        assert.deepEqual(b,expected[j]);

        checks++;
    }
}

assert.deepEqual(
    original.stats(),
    fast.stats()
);

console.log('Equality checks:',checks);
console.log('Cache statistics equality: PASS');

const result = fast.getOrCompute(
    cases[0],
    () => predictDamage(cases[0])
);

result.rolls[0] = -999;
result.currentHP = -999;

assert.deepEqual(
    fast.getOrCompute(cases[0],() => null),
    expected[0]
);

const missCache = new FastCalculationCache();

const first = missCache.getOrCompute(
    cases[0],
    () => predictDamage(cases[0])
);

first.rolls[0] = -999;

assert.deepEqual(
    missCache.getOrCompute(cases[0],() => null),
    expected[0]
);

console.log('Mutation protection on hit/miss: PASS');

const nested = {
    values:[{hp:100}],
    details:{status:'par'}
};

const cloned = cloneCalculation(nested);

cloned.values[0].hp = 0;
cloned.details.status = 'brn';

assert.equal(nested.values[0].hp,100);
assert.equal(nested.details.status,'par');

assert.equal(cloneCalculation(123),123);
assert.equal(cloneCalculation(null),null);

assert.deepEqual(
    cloneCalculation({...expected[0],rolls:null}),
    {...expected[0],rolls:null}
);

console.log('Generic fallback and scalar checks: PASS');

const lru = new FastCalculationCache(2);

assert.equal(lru.getOrCompute('A',() => 1),1);
assert.equal(lru.getOrCompute('B',() => 2),2);
assert.equal(lru.getOrCompute('A',() => 99),1);
assert.equal(lru.getOrCompute('C',() => 3),3);
assert.equal(lru.entries.has(JSON.stringify('B')),false);
assert.equal(lru.evictions,1);

lru.clear();

assert.equal(lru.stats().size,0);
assert.equal(lru.stats().hits,0);
assert.equal(lru.stats().misses,0);

console.log('LRU and reset: PASS');

const iterations = 200000;

function benchmark(cache) {
    const started = performance.now();

    for (let i = 0; i < iterations; i++) {
        const index = i % cases.length;

        cache.getOrCompute(
            cases[index],
            () => expected[index]
        );
    }

    return performance.now() - started;
}

// Warm-up.
benchmark(original);
benchmark(fast);

const rounds = [];

for (let i = 0; i < 5; i++) {
    let originalMs;
    let fastMs;

    if (i % 2 === 0) {
        originalMs = benchmark(original);
        fastMs = benchmark(fast);
    } else {
        fastMs = benchmark(fast);
        originalMs = benchmark(original);
    }

    rounds.push({
        Round:i+1,
        OriginalMs:originalMs,
        FastMs:fastMs,
        Speedup:originalMs/fastMs
    });
}

function median(values) {
    return [...values].sort((a,b)=>a-b)[
        Math.floor(values.length/2)
    ];
}

const originalMedian = median(
    rounds.map(r=>r.OriginalMs)
);

const fastMedian = median(
    rounds.map(r=>r.FastMs)
);

const summary = {
    EqualityChecks:checks,
    Mismatches:0,
    IterationsPerRound:iterations,
    Rounds:rounds.length,
    OriginalMedianMs:originalMedian.toFixed(3),
    FastMedianMs:fastMedian.toFixed(3),
    Speedup:(originalMedian/fastMedian).toFixed(3)+'x',
    Reduction:(
        (1-fastMedian/originalMedian)*100
    ).toFixed(2)+'%'
};

console.log('\n=== BENCHMARK ROUNDS ===');
console.table(rounds);

console.log('\n=== FAST CACHE SUMMARY ===');
console.table(summary);

require('node:fs').writeFileSync(
    'logs/fast_cache_test.json',
    JSON.stringify({summary,rounds},null,2)
);

console.log('\nFAST CALCULATION CACHE TEST: PASS');
