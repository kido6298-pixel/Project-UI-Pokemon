const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { StrategicAgent } = require('../src/agents/strategic_agent');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const agent = new StrategicAgent('p1', createRandom(1001));

    const result = await simulate({
        team1,
        team2,
        seed: [12345, 23456, 34567, 45678],
        agent1: agent,
        agent2: new RandomAgent(createRandom(2001))
    });

    assert.ok(agent.evaluations > 0);
    assert.ok(result.winner);

    console.log('\n=== STRATEGIC AI RESULT ===');
    console.log('Winner:', result.winner);
    console.log('Turns:', result.turns);
    console.log('Evaluated moves:', agent.evaluations);
    console.log('Fallbacks:', agent.fallbacks);
    console.log('Decisions:', result.decisions.length);

    console.log('\n=== STRATEGIC AI ACTIONS ===');

    for (const decision of result.decisions) {
        if (decision.player === 'AI-1') {
            console.log(
                'Turn', decision.turn,
                decision.action
            );
        }
    }

    console.log('\nSTRATEGIC AGENT TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
