const fs = require('node:fs');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { simulate } = require('../src/simulator');
const { StrategicAgent } = require('../src/agents/strategic_agent_v01');
const { StrategicAgentV02 } = require('../src/agents/strategic_agent_v02');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const COUNT = 1000;

function createAgent(version, side, seed) {
    const random = createRandom(seed);

    if (version === 'V01') {
        return new StrategicAgent(side, random);
    }

    if (version === 'V02') {
        return new StrategicAgentV02(side, random);
    }

    return new RandomAgent(random);
}

async function benchmark(a, b) {
    const stats = {
        AI1: a,
        AI2: b,
        completed: 0,
        winsAI1: 0,
        winsAI2: 0,
        draws: 0,
        errors: 0,
        limited: 0,
        turns: 0,
        evaluations: 0,
        threatEvaluations: 0,
        riskDecisions: 0,
        fallbacks: 0,
        errorDetails: []
    };

    const started = performance.now();

    console.log(`\n=== ${a} VS ${b} ===`);

    for (let i = 1; i <= COUNT; i++) {
        const agent1 = createAgent(a, 'p1', 1000 + i);
        const agent2 = createAgent(b, 'p2', 2000 + i);

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

            if (result.winner === 'AI-1') stats.winsAI1++;
            else if (result.winner === 'AI-2') stats.winsAI2++;
            else stats.draws++;

            if (result.limited) stats.limited++;

            for (const agent of [agent1, agent2]) {
                stats.evaluations += agent.evaluations || 0;
                stats.threatEvaluations += agent.threatEvaluations || 0;
                stats.riskDecisions += agent.riskDecisions || 0;
                stats.fallbacks += agent.fallbacks || 0;
            }

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

    stats.seconds = (performance.now() - started) / 1000;
    stats.winRateAI1 = stats.winsAI1 / stats.completed * 100;
    stats.winRateAI2 = stats.winsAI2 / stats.completed * 100;
    stats.averageTurns = stats.turns / stats.completed;

    return stats;
}

async function main() {
    const results = [];

    for (const [a, b] of [
        ['V01', 'V01'],
        ['V02', 'V01'],
        ['V01', 'V02'],
        ['V02', 'V02'],
        ['V02', 'Random'],
        ['Random', 'V02']
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
        AI1rate: r.winRateAI1.toFixed(2),
        AI2rate: r.winRateAI2.toFixed(2),
        avgTurns: r.averageTurns.toFixed(2),
        seconds: r.seconds.toFixed(2)
    })));

    const [base, b, c, self, d, e] = results;

    const wins = b.winsAI1 + c.winsAI2;
    const losses = b.winsAI2 + c.winsAI1;
    const draws = b.draws + c.draws;

    const summary = {
        V02vsV01: {
            wins,
            losses,
            draws,
            winRate: wins / (b.completed + c.completed) * 100,
            scoreRate: (wins + draws * 0.5) /
                (b.completed + c.completed) * 100
        },
        team1ImprovementPP:
            b.winRateAI1 - base.winRateAI1,
        team2ImprovementPP:
            c.winRateAI2 - base.winRateAI2,
        V02vsRandomWinRate:
            (d.winsAI1 + e.winsAI2) /
            (d.completed + e.completed) * 100,
        V01vsRandomBaseline: 89.9,
        totalCompleted: results.reduce(
            (sum, r) => sum + r.completed, 0
        ),
        totalErrors: results.reduce(
            (sum, r) => sum + r.errors, 0
        ),
        totalLimited: results.reduce(
            (sum, r) => sum + r.limited, 0
        ),
        totalThreatEvaluations: results.reduce(
            (sum, r) => sum + r.threatEvaluations, 0
        ),
        totalRiskDecisions: results.reduce(
            (sum, r) => sum + r.riskDecisions, 0
        ),
        totalFallbacks: results.reduce(
            (sum, r) => sum + r.fallbacks, 0
        ),
        totalSeconds: results.reduce(
            (sum, r) => sum + r.seconds, 0
        )
    };

    console.log('\n=== V0.2 SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/strategic_benchmark_v02.json',
        JSON.stringify({results, summary}, null, 2)
    );

    assert.equal(summary.totalCompleted, 6000);
    assert.equal(summary.totalErrors, 0);
    assert.equal(summary.totalLimited, 0);

    console.log('V0.2 BENCHMARK: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
