const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');

const {
    runParallelBattles
} = require('../src/parallel_simulator');

async function main() {
    const count = 240;

    const workerCounts = [
        8,12,16
    ].filter(
        n => n <= os.availableParallelism()
    );

    const summary = [];

    let baseline = null;
    let baselineSeconds = null;

    fs.mkdirSync('logs',{recursive:true});

    const started = performance.now();

    for (const workers of workerCounts) {
        console.log(
            '\n=== WORKERS: ' + workers + ' ==='
        );

        const run = await runParallelBattles({
            count,
            workers,
            taskTimeoutMs:300000,

            onProgress({completed,count}) {
                if (
                    completed % 40 === 0 ||
                    completed === count
                ) {
                    console.log(
                        completed + '/' + count
                    );
                }
            }
        });

        for (const result of run.results) {
            assert.equal(result.stats.searchErrors,0);
            assert.equal(result.stats.inferenceErrors,0);
            assert.equal(result.stats.fallbacks,0);
            assert.equal(result.stats.limited,0);
        }

        if (baseline === null) {
            baseline = run.results;
            baselineSeconds = run.seconds;
        } else {
            assert.deepEqual(
                run.results,
                baseline
            );
        }

        const row = {
            Workers:run.workers,
            Battles:run.count,
            Seconds:run.seconds,
            BattlesPerSecond:run.battlesPerSecond,
            PeakRSSMB:run.peakRSSMB,
            Speedup:
                baselineSeconds / run.seconds,
            Efficiency:
                baselineSeconds /
                run.seconds /
                run.workers,
            Equality:'PASS'
        };

        summary.push(row);

        console.table([row]);

        fs.writeFileSync(
            'logs/parallel_scaling_validation.json',
            JSON.stringify({
                summary,
                complete:false
            },null,2)
        );

        // Allow worker resources to settle.
        await new Promise(
            resolve => setTimeout(resolve,2000)
        );
    }

    const fastest = [...summary].sort(
        (a,b) => a.Seconds-b.Seconds
    )[0];

    const totalSeconds =
        (performance.now()-started)/1000;

    console.log('\n=== SCALING SUMMARY ===');

    console.table(summary.map(row => ({
        Workers:row.Workers,
        Battles:row.Battles,
        Seconds:row.Seconds.toFixed(3),
        BattlesPerSecond:
            row.BattlesPerSecond.toFixed(3),
        PeakRSSMB:row.PeakRSSMB.toFixed(2),
        Speedup:row.Speedup.toFixed(3)+'x',
        Efficiency:
            (row.Efficiency*100).toFixed(2)+'%',
        Equality:row.Equality
    })));

    console.log('\n=== FASTEST CONFIGURATION ===');

    console.table({
        Workers:fastest.Workers,
        Speedup:fastest.Speedup.toFixed(3)+'x',
        BattlesPerSecond:
            fastest.BattlesPerSecond.toFixed(3),
        PeakRSSMB:fastest.PeakRSSMB.toFixed(2),
        Estimated1000Seconds:
            (1000/fastest.BattlesPerSecond).toFixed(2),
        Estimated10000Minutes:
            (10000/fastest.BattlesPerSecond/60).toFixed(2),
        TotalBenchmarkSeconds:totalSeconds.toFixed(2)
    });

    fs.writeFileSync(
        'logs/parallel_scaling_validation.json',
        JSON.stringify({
            summary,
            fastest,
            totalSeconds,
            complete:true
        },null,2)
    );

    console.log('\nPARALLEL SCALING VALIDATION: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

