const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { simulate } = require('../src/simulator');
const { StrategicAgent } = require('../src/agents/strategic_agent');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const COUNT = 1000;

function createAgent(type, side, seed) {
    const random = createRandom(seed);

    return type === 'Strategic'
        ? new StrategicAgent(side, random)
        : new RandomAgent(random);
}

async function benchmark(type1, type2) {
    const stats = {
        AI1: type1,
        AI2: type2,
        requested: COUNT,
        completed: 0,
        winsAI1: 0,
        winsAI2: 0,
        draws: 0,
        limited: 0,
        errors: 0,
        turns: 0,
        evaluations: 0,
        fallbacks: 0,
        errorDetails: []
    };

    const started = performance.now();

    console.log(`\n=== ${type1} VS ${type2} ===`);

    for (let i = 1; i <= COUNT; i++) {
        const agent1 = createAgent(type1, 'p1', 1000 + i);
        const agent2 = createAgent(type2, 'p2', 2000 + i);

        try {
            const result = await simulate({
                team1,
                team2,
                agent1,
                agent2,
                seed: [i, 23456, 34567, 45678]
            });

            stats.completed++;
            stats.turns += result.turns;

            if (result.winner === 'AI-1') {
                stats.winsAI1++;
            } else if (result.winner === 'AI-2') {
                stats.winsAI2++;
            } else {
                stats.draws++;
            }

            if (result.limited) stats.limited++;

            stats.evaluations +=
                (agent1.evaluations || 0) +
                (agent2.evaluations || 0);

            stats.fallbacks +=
                (agent1.fallbacks || 0) +
                (agent2.fallbacks || 0);

        } catch (error) {
            stats.errors++;

            stats.errorDetails.push({
                battleId: i,
                error: error.message
            });
        }

        if (i % 250 === 0) {
            console.log(`Progress: ${i}/${COUNT}`);
        }
    }

    stats.elapsedSeconds =
        (performance.now() - started) / 1000;

    stats.averageTurns = stats.completed
        ? stats.turns / stats.completed
        : null;

    stats.winRateAI1 = stats.completed
        ? stats.winsAI1 / stats.completed * 100
        : null;

    stats.winRateAI2 = stats.completed
        ? stats.winsAI2 / stats.completed * 100
        : null;

    return stats;
}

async function main() {
    const results = [];

    for (const [a, b] of [
        ['Random', 'Random'],
        ['Strategic', 'Random'],
        ['Random', 'Strategic'],
        ['Strategic', 'Strategic']
    ]) {
        results.push(await benchmark(a, b));
    }

    console.log('\n=== BENCHMARK RESULTS ===');

    console.table(results.map(r => ({
        AI1: r.AI1,
        AI2: r.AI2,
        completed: r.completed,
        AI1wins: r.winsAI1,
        AI2wins: r.winsAI2,
        draws: r.draws,
        errors: r.errors,
        limited: r.limited,
        AI1rate: r.winRateAI1?.toFixed(2),
        AI2rate: r.winRateAI2?.toFixed(2),
        avgTurns: r.averageTurns?.toFixed(2),
        seconds: r.elapsedSeconds.toFixed(2)
    })));

    const baseline = results[0];
    const b = results[1];
    const c = results[2];

    const total = b.completed + c.completed;
    const wins = b.winsAI1 + c.winsAI2;
    const losses = b.winsAI2 + c.winsAI1;

    const summary = {
        strategicWins: wins,
        strategicLosses: losses,
        draws: b.draws + c.draws,
        strategicWinRate: total
            ? wins / total * 100
            : null,
        team1ImprovementPP:
            b.winRateAI1 - baseline.winRateAI1,
        team2ImprovementPP:
            c.winRateAI2 - baseline.winRateAI2,
        totalErrors: results.reduce(
            (sum, r) => sum + r.errors, 0
        ),
        totalLimited: results.reduce(
            (sum, r) => sum + r.limited, 0
        ),
        totalEvaluations: results.reduce(
            (sum, r) => sum + r.evaluations, 0
        ),
        totalFallbacks: results.reduce(
            (sum, r) => sum + r.fallbacks, 0
        )
    };

    console.log('\n=== STRATEGIC AI SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/strategic_benchmark_v01.json',
        JSON.stringify({results, summary}, null, 2)
    );

    console.log(
        summary.totalErrors === 0
            ? 'BENCHMARK: PASS'
            : 'BENCHMARK: FAIL'
    );

    if (summary.totalErrors) process.exitCode = 1;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
