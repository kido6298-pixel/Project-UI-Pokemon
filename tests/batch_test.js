const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const count = 100;
    const started = performance.now();
    const results = [];
    const stats = {
        requested: count,
        completed: 0,
        errors: 0,
        winsAI1: 0,
        winsAI2: 0,
        draws: 0,
        limited: 0,
        totalTurns: 0,
        totalDecisions: 0
    };

    fs.mkdirSync('logs', {recursive: true});

    const output = 'logs/batch_100.jsonl';
    fs.writeFileSync(output, '');

    for (let i = 1; i <= count; i++) {
        try {
            const result = await simulate({
                team1,
                team2,
                agent1: new RandomAgent(),
                agent2: new RandomAgent()
            });

            stats.completed++;
            stats.totalTurns += result.turns;
            stats.totalDecisions += result.decisions.length;

            if (result.limited) {
                stats.limited++;
            } else if (result.winner === 'AI-1') {
                stats.winsAI1++;
            } else if (result.winner === 'AI-2') {
                stats.winsAI2++;
            } else {
                stats.draws++;
            }

            const record = {
                battleId: i,
                ...result
            };

            fs.appendFileSync(
                output,
                JSON.stringify(record) + '\n'
            );

        } catch (error) {
            stats.errors++;

            const failure = {
                battleId: i,
                error: error.message
            };

            results.push(failure);

            fs.appendFileSync(
                output,
                JSON.stringify(failure) + '\n'
            );

            console.error('Battle', i, error.message);
        }

        if (i % 10 === 0) {
            console.log(`Progress: ${i}/${count}`);
        }
    }

    const elapsed = (performance.now() - started) / 1000;

    const summary = {
        ...stats,
        elapsedSeconds: Number(elapsed.toFixed(3)),
        battlesPerSecond: Number(
            (stats.completed / elapsed).toFixed(2)
        ),
        averageTurns: Number(
            (stats.totalTurns / (stats.completed || 1)).toFixed(2)
        ),
        averageDecisions: Number(
            (stats.totalDecisions / (stats.completed || 1)).toFixed(2)
        ),
        errorDetails: results
    };

    fs.writeFileSync(
        'logs/batch_100_summary.json',
        JSON.stringify(summary, null, 2)
    );

    console.log('\n=== BATCH RESULT ===');
    console.log(JSON.stringify(summary, null, 2));

    if (stats.errors === 0 && stats.completed === count) {
        console.log('BATCH TEST: PASS');
    } else {
        console.log('BATCH TEST: FAIL');
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
