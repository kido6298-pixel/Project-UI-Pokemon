const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

const {
    StrategicAgentV03
} = require('../src/agents/strategic_agent_v03');

const {
    StrategicAgentV04
} = require('../src/agents/strategic_agent_v04');

async function main() {
    const stats = {
        battles: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        limited: 0,
        decisions: 0,
        evaluations: 0,
        switches: 0,
        fallbacks: 0,
        errors: 0,
        searchTimeMs: 0
    };

    const records = [];
    const started = performance.now();

    for (let i = 1; i <= 20; i++) {
        const side = i % 2 ? 'p1' : 'p2';

        const v04 = new StrategicAgentV04(
            side,
            createRandom(3000 + i)
        );

        const v03 = new StrategicAgentV03(
            side === 'p1' ? 'p2' : 'p1',
            createRandom(4000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1: side === 'p1' ? v04 : v03,
            agent2: side === 'p2' ? v04 : v03,
            seed: [i, 23456, 34567, 45678],
            timeoutMs: 120000
        });

        const winner = side === 'p1' ? 'AI-1' : 'AI-2';

        stats.battles++;

        if (result.winner === 'DRAW') stats.draws++;
        else if (result.winner === winner) stats.wins++;
        else stats.losses++;

        if (result.limited) stats.limited++;

        stats.decisions += v04.searchDecisions;
        stats.evaluations += v04.searchEvaluations;
        stats.switches += v04.searchSwitches;
        stats.fallbacks += v04.searchFallbacks;
        stats.errors += v04.searchErrors;
        stats.searchTimeMs += v04.searchTimeMs;

        records.push({
            battle: i,
            side,
            winner: result.winner,
            turns: result.turns,
            lastError: v04.lastError,
            history: v04.searchHistory
        });

        console.log(
            'Battle ' + i + '/20',
            'Winner=' + result.winner,
            'Turns=' + result.turns,
            'Search=' + v04.searchDecisions,
            'Switch=' + v04.searchSwitches,
            'Errors=' + v04.searchErrors
        );

        if (v04.lastError) {
            console.log('Last error:', v04.lastError);
        }
    }

    stats.seconds =
        (performance.now() - started) / 1000;

    stats.scoreRate =
        (stats.wins + stats.draws * 0.5) /
        stats.battles;

    stats.averageSearchMs =
        stats.searchTimeMs /
        Math.max(1, stats.decisions + stats.fallbacks);

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/strategic_v04_test.json',
        JSON.stringify({stats, records}, null, 2)
    );

    console.log('\n=== STRATEGIC AI V0.4 TEST ===');
    console.log(JSON.stringify(stats, null, 2));

    assert.equal(stats.battles, 20);
    assert.ok(stats.decisions > 0);
    assert.ok(stats.evaluations > 0);
    assert.equal(stats.errors, 0);
    assert.equal(stats.limited, 0);

    console.log('\nSTRATEGIC AI V0.4 TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
