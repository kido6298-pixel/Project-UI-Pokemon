const fs = require('node:fs');

const results = [];

for (const name of [
    'enemy_inference_accuracy',
    'realistic_enemy_inference_accuracy'
]) {
    const before = JSON.parse(
        fs.readFileSync(
            `logs/${name}_baseline.json`, 'utf8'
        )
    ).summary;

    const after = JSON.parse(
        fs.readFileSync(
            `logs/${name}.json`, 'utf8'
        )
    ).summary;

    results.push({
        Dataset: name,
        Previous: Number(before.After),
        Expanded: Number(after.After),
        Improvement: (
            Number(before.After) -
            Number(after.After)
        ).toFixed(3),
        PreviousMinimum: Number(before.MinimumError),
        ExpandedMinimum: Number(after.MinimumError)
    });
}

console.log('\n=== BUILD EXPANSION COMPARISON ===');
console.table(results);
