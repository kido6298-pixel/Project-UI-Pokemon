const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    runParallelBattles
} = require('../src/parallel_simulator');

async function main() {
    const baseline = JSON.parse(
        fs.readFileSync(
            'benchmarks/strategic_v05_optimized_test.json',
            'utf8'
        )
    );

    const runs = [];

    for (const workers of [1,4]) {
        console.log(
            '\n=== WORKERS: ' + workers + ' ==='
        );

        const run = await runParallelBattles({
            count:20,
            workers,
            onProgress({completed,count,id,result}) {
                console.log(
                    completed + '/' + count,
                    'Battle=' + id,
                    'Winner=' + result.record.winner,
                    'Turns=' + result.record.turns
                );
            }
        });

        assert.deepEqual(
            run.results.map(r=>r.record),
            baseline.records
        );

        for (const result of run.results) {
            assert.equal(result.stats.searchErrors,0);
            assert.equal(result.stats.inferenceErrors,0);
            assert.equal(result.stats.limited,0);
            assert.equal(result.stats.fallbacks,0);
        }

        console.log(
            'Original benchmark equality: PASS'
        );

        runs.push(run);
    }

    assert.deepEqual(
        runs[0].results,
        runs[1].results
    );

    console.log(
        '\nSequential/parallel equality: PASS'
    );

    const summary = runs.map(run => ({
        Workers:run.workers,
        Battles:run.count,
        Seconds:run.seconds.toFixed(3),
        BattlesPerSecond:
            run.battlesPerSecond.toFixed(3),
        PeakRSSMB:run.peakRSSMB.toFixed(2),
        Speedup:(
            runs[0].seconds / run.seconds
        ).toFixed(3)+'x'
    }));

    console.log('\n=== PARALLEL SUMMARY ===');
    console.table(summary);

    fs.mkdirSync('logs',{recursive:true});

    fs.writeFileSync(
        'logs/parallel_equivalence_test.json',
        JSON.stringify({
            summary,
            runs
        },null,2)
    );

    console.log(
        '\nPARALLEL SIMULATION TEST: PASS'
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
