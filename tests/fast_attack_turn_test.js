const assert = require('node:assert/strict');

const {
    evaluateAttackTurn: original
} = require('../src/attack_turn');

const {
    evaluateAttackTurn: fast
} = require('../src/attack_turn_fast');

const {
    createRandom
} = require('../src/random');

const random = createRandom(20261125);

function integer(min,max) {
    return min + Math.floor(
        random() * (max-min+1)
    );
}

const statuses = [
    undefined,
    'brn','par','psn','tox','slp','frz'
];

const accuracies = [
    0,0.5,0.7,0.75,0.8,0.85,0.9,0.95,1
];

const orders = [0,0.5,1,0.25,0.75];

function pokemon(species) {
    const maxHP = integer(1,362);

    return {
        species,
        maxHP,
        currentHP:integer(1,maxHP),
        status:statuses[
            integer(0,statuses.length-1)
        ]
    };
}

function rolls() {
    const type = integer(0,4);

    if (type === 0) return [0];
    if (type === 1) return [integer(1,400)];
    if (type === 2) return Array(16).fill(50);

    const base = integer(1,400);

    return Array.from(
        {length:16},
        (_,i) => Math.floor(
            base * (85+i) / 100
        )
    );
}

const cases = [];

for (let i = 0; i < 10000; i++) {
    cases.push({
        own:pokemon('Garchomp'),
        enemy:pokemon('Suicune'),
        ownRolls:rolls(),
        enemyRolls:rolls(),
        ownAccuracy:accuracies[
            integer(0,accuracies.length-1)
        ],
        enemyAccuracy:accuracies[
            integer(0,accuracies.length-1)
        ],
        firstChance:orders[
            integer(0,orders.length-1)
        ]
    });
}

let outcomeChecks = 0;

for (let i = 0; i < cases.length; i++) {
    const expected = original(cases[i]);
    const actual = fast(cases[i]);

    try {
        assert.deepEqual(actual,expected);
    } catch (error) {
        console.log('Failed case:',i);
        console.dir(cases[i],{depth:null});
        throw error;
    }

    outcomeChecks += expected.outcomes.length;
}

console.log('Exact equality: PASS');

const invalidCases = [
    {...cases[0],firstChance:2},
    {...cases[0],ownRolls:[]},
    {...cases[0],enemyRolls:[-1]},
    {...cases[0],ownAccuracy:1.5},
    {
        ...cases[0],
        own:{...cases[0].own,currentHP:0}
    }
];

for (const input of invalidCases) {
    assert.throws(() => original(input));
    assert.throws(() => fast(input));
}

console.log('Invalid input protection: PASS');

const unusual = {
    ...cases[0],
    ownRolls:[10.5,20.5],
    enemyRolls:[5.5,15.5]
};

assert.deepEqual(
    fast(unusual),
    original(unusual)
);

console.log('Unusual input fallback: PASS');

function benchmark(fn) {
    const started = performance.now();

    for (const input of cases) {
        fn(input);
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
    Cases:cases.length,
    OutcomeChecks:outcomeChecks,
    Mismatches:0,
    OriginalMedianMs:originalMedian.toFixed(3),
    FastMedianMs:fastMedian.toFixed(3),
    Speedup:(originalMedian/fastMedian).toFixed(3)+'x',
    Reduction:(
        (1-fastMedian/originalMedian)*100
    ).toFixed(2)+'%'
};

console.log('\n=== BENCHMARK ROUNDS ===');
console.table(rounds);

console.log('\n=== FAST ATTACK TURN SUMMARY ===');
console.table(summary);

require('node:fs').writeFileSync(
    'logs/fast_attack_turn_test.json',
    JSON.stringify({summary,rounds},null,2)
);

console.log('\nFAST ATTACK TURN TEST: PASS');
