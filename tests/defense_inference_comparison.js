const fs = require('node:fs');
const assert = require('node:assert/strict');

const average = values =>
    values.reduce((a, b) => a + b, 0) / values.length;

const keyOf = record =>
    JSON.stringify([record.battle, record.species]);

function compare(name) {
    const old = JSON.parse(fs.readFileSync(
        `logs/${name}_before_defense.json`, 'utf8'
    ));

    const current = JSON.parse(fs.readFileSync(
        `logs/${name}.json`, 'utf8'
    ));

    const previous = new Map(
        old.records.map(r => [keyOf(r), r])
    );

    assert.equal(previous.size, old.records.length);

    assert.equal(
        new Set(current.records.map(keyOf)).size,
        current.records.length
    );

    const paired = current.records
        .filter(r => previous.has(keyOf(r)))
        .map(r => ({
            species: r.species,
            before: Number(previous.get(keyOf(r)).afterMAE),
            after: Number(r.afterMAE)
        }));

    assert.ok(paired.length > 0);
    assert.ok(paired.every(r =>
        Number.isFinite(r.before) &&
        Number.isFinite(r.after)
    ));

    const before = average(paired.map(r => r.before));
    const after = average(paired.map(r => r.after));

    const summary = {
        PreviousRecords: old.records.length,
        CurrentRecords: current.records.length,
        MatchedRecords: paired.length,
        PreviousMAE: before.toFixed(3),
        CurrentMAE: after.toFixed(3),
        Improvement: (
            (1 - after / before) * 100
        ).toFixed(2) + '%',
        Improved: paired.filter(
            r => r.before - r.after > 1e-9
        ).length,
        Unchanged: paired.filter(
            r => Math.abs(r.before - r.after) <= 1e-9
        ).length,
        Worsened: paired.filter(
            r => r.after - r.before > 1e-9
        ).length
    };

    console.log('\n=== ' + name + ' ===');
    console.table(summary);

    console.table(
        [...new Set(paired.map(r => r.species))]
            .map(species => {
                const rows = paired.filter(
                    r => r.species === species
                );

                const b = average(rows.map(r => r.before));
                const a = average(rows.map(r => r.after));

                return {
                    Pokemon: species,
                    Count: rows.length,
                    Before: b.toFixed(3),
                    After: a.toFixed(3),
                    Improvement: (b - a).toFixed(3)
                };
            })
    );

    return {summary, paired};
}

const results = {
    original: compare('enemy_inference_accuracy'),
    realistic: compare('realistic_enemy_inference_accuracy')
};

fs.writeFileSync(
    'logs/defense_inference_comparison.json',
    JSON.stringify(results, null, 2)
);

console.log('\nPAIRED ACCURACY COMPARISON: PASS');
