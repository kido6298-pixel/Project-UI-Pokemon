const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { StrategicAgentV02 } = require('../src/agents/strategic_agent_v02');
const { StrategicAgent } = require('../src/agents/strategic_agent_v01');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const stats = {
        wins: 0,
        losses: 0,
        draws: 0,
        evaluations: 0,
        threatEvaluations: 0,
        riskDecisions: 0
    };

    for (let i = 1; i <= 100; i++) {
        const agent = new StrategicAgentV02(
            'p1',
            createRandom(1000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1: agent,
            agent2: new StrategicAgent(
                'p2',
                createRandom(2000 + i)
            ),
            seed: [i, 23456, 34567, 45678]
        });

        if (result.winner === 'AI-1') stats.wins++;
        else if (result.winner === 'AI-2') stats.losses++;
        else stats.draws++;

        stats.evaluations += agent.evaluations;
        stats.threatEvaluations += agent.threatEvaluations;
        stats.riskDecisions += agent.riskDecisions;
    }

    assert.equal(
        stats.wins + stats.losses + stats.draws,
        100
    );

    assert.ok(stats.evaluations > 0);
    assert.ok(stats.threatEvaluations > 0);

    console.log('\n=== STRATEGIC AI V0.2 ===');
    console.log(JSON.stringify(stats, null, 2));
    console.log('STRATEGIC V0.2 TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
