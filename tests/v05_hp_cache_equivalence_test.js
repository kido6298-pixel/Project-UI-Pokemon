const fs = require('node:fs');
const assert = require('node:assert/strict');

const original = JSON.parse(
    fs.readFileSync(
        'logs/strategic_v05_test.json',
        'utf8'
    )
);

const cached = JSON.parse(
    fs.readFileSync(
        'logs/strategic_v05_hp_cached_test.json',
        'utf8'
    )
);

assert.equal(
    original.records.length,
    cached.records.length
);

const ignored = new Set([
    'seconds',
    'searchTimeMs'
]);

for (const key of Object.keys(original.stats)) {
    if (ignored.has(key)) continue;

    assert.deepEqual(
        cached.stats[key],
        original.stats[key],
        'Statistics mismatch: ' + key
    );
}

let battles = 0;
let decisions = 0;
let candidates = 0;
let buildChecks = 0;

for (let i = 0; i < original.records.length; i++) {
    const a = original.records[i];
    const b = cached.records[i];

    assert.equal(a.battle, b.battle);
    assert.equal(a.side, b.side);
    assert.equal(a.winner, b.winner);
    assert.equal(a.turns, b.turns);

    assert.equal(
        a.history.length,
        b.history.length
    );

    for (let j = 0; j < a.history.length; j++) {
        const x = a.history[j];
        const y = b.history[j];

        const label =
            'Battle ' + a.battle +
            ', Decision ' + (j + 1);

        assert.deepEqual(
            x.chosen,
            y.chosen,
            label + ': chosen action'
        );

        assert.deepEqual(
            x.candidates,
            y.candidates,
            label + ': candidate scores'
        );

        assert.deepEqual(
            x.builds,
            y.builds,
            label + ': enemy builds'
        );

        assert.deepEqual(
            x,
            y,
            label + ': full decision history'
        );

        decisions++;
        candidates += x.candidates.length;
        buildChecks += x.builds.length;
    }

    assert.deepEqual(a, b);

    battles++;
}

const before = original.stats.seconds;
const after = cached.stats.seconds;

const summary = {
    Battles: battles,
    DecisionChecks: decisions,
    CandidateChecks: candidates,
    BuildChecks: buildChecks,
    Mismatches: 0,
    BeforeSeconds: before.toFixed(3),
    AfterSeconds: after.toFixed(3),
    Speedup: (before / after).toFixed(3) + 'x',
    Reduction: (
        (1 - after / before) * 100
    ).toFixed(2) + '%'
};

console.log('\n=== EXACT EQUIVALENCE RESULTS ===');
console.table(summary);

fs.writeFileSync(
    'logs/v05_hp_cache_equivalence.json',
    JSON.stringify(summary, null, 2)
);

console.log('\nV0.5 HP CACHE EQUIVALENCE TEST: PASS');

