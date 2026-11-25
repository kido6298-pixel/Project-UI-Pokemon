const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { createRandom } = require('../src/random');

const {
    team1,
    team2
} = require('../src/realistic_test_teams');

const {
    StrategicAgentV04
} = require('../src/agents/strategic_agent_v04');

const {
    StrategicAgentV05FastCached
} = require('../src/agents/strategic_agent_v05_fast_cached');

async function main() {
    const stats = {
        battles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        decisions: 0,
        posteriorUses: 0,
        priorUses: 0,
        buildSelections: 0,
        totalSelectedBuilds: 0,
        totalCoverage: 0,
        evaluations: 0,
        switches: 0,
        fallbacks: 0,
        searchErrors: 0,
        inferenceErrors: 0,
        limited: 0,
        searchTimeMs: 0
    };

    const records = [];

    const cacheTotals = {
        damageHits: 0,
        damageMisses: 0,
        speedHits: 0,
        speedMisses: 0,
        damageEvictions: 0,
        speedEvictions: 0
    };
    const started = performance.now();

    for (let i = 1; i <= 20; i++) {
        const side = i % 2 ? 'p1' : 'p2';

        const agent = new StrategicAgentV05FastCached(
            side,
            createRandom(3000 + i)
        );

        const opponent = new StrategicAgentV04(
            side === 'p1' ? 'p2' : 'p1',
            createRandom(4000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1: side === 'p1' ? agent : opponent,
            agent2: side === 'p2' ? agent : opponent,
            seed: [i,23456,34567,45678],
            timeoutMs: 120000
        });

        const ownWinner =
            side === 'p1' ? 'AI-1' : 'AI-2';

        stats.battles++;

        if (result.winner === 'DRAW') {
            stats.draws++;
        } else if (result.winner === ownWinner) {
            stats.wins++;
        } else {
            stats.losses++;
        }

        stats.decisions += agent.searchDecisions;
        stats.posteriorUses += agent.posteriorUses;
        stats.priorUses += agent.priorUses;
        stats.buildSelections += agent.buildSelections;
        stats.totalSelectedBuilds += agent.totalSelectedBuilds;
        stats.totalCoverage += agent.totalCoverage;
        stats.evaluations += agent.searchEvaluations;
        stats.switches += agent.searchSwitches;
        stats.fallbacks += agent.searchFallbacks;
        stats.searchErrors += agent.searchErrors;

        stats.inferenceErrors +=
            agent.inferenceErrors +
            agent.inference.stats.errors;

        stats.searchTimeMs += agent.searchTimeMs;

        if (result.limited) stats.limited++;

        for (const key of Object.keys(cacheTotals)) {
            cacheTotals[key] += agent.cacheStats[key];
        }

        records.push({
            battle: i,
            side,
            winner: result.winner,
            turns: result.turns,
            posteriorUses: agent.posteriorUses,
            priorUses: agent.priorUses,
            lastError: agent.lastError,
            lastInferenceError:
                agent.lastInferenceError ||
                agent.inference.lastError,
            history: agent.searchHistory
        });

        console.log(
            i + '/20',
            'Winner=' + result.winner,
            'Turns=' + result.turns,
            'Posterior=' + agent.posteriorUses,
            'Errors=' + (
                agent.searchErrors +
                agent.inferenceErrors +
                agent.inference.stats.errors
            )
        );

        if (agent.lastError) {
            console.error(agent.lastError);
        }

        if (agent.lastInferenceError ||
            agent.inference.lastError) {
            console.error(
                agent.lastInferenceError ||
                agent.inference.lastError
            );
        }
    }

    stats.averageBuilds =
        stats.totalSelectedBuilds /
        stats.buildSelections;

    stats.averageCoverage =
        stats.totalCoverage /
        stats.buildSelections;

    stats.seconds =
        (performance.now() - started) / 1000;

    console.log('\n=== STRATEGIC V0.5 SUMMARY ===');
    console.table(stats);

    console.log('\n=== LIVE CACHE STATISTICS ===');

    console.table({
        ...cacheTotals,
        damageHitRate:
            cacheTotals.damageHits /
            (cacheTotals.damageHits + cacheTotals.damageMisses),
        speedHitRate:
            cacheTotals.speedHits /
            (cacheTotals.speedHits + cacheTotals.speedMisses)
    });

    fs.mkdirSync('logs', {recursive:true});

    fs.writeFileSync(
        'logs/strategic_v05_fast_cached_test.json',
        JSON.stringify({stats,records,cacheTotals},null,2)
    );

    assert.equal(stats.battles, 20);
    assert.equal(stats.searchErrors, 0);
    assert.equal(stats.inferenceErrors, 0);
    assert.equal(stats.limited, 0);
    assert.ok(stats.decisions > 0);
    assert.ok(stats.posteriorUses > 0);
    assert.ok(stats.priorUses > 0);
    assert.ok(stats.averageBuilds >= 1);
    assert.ok(stats.averageBuilds <= 5);

    console.log('\nSTRATEGIC V0.5 INTEGRATION TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});



