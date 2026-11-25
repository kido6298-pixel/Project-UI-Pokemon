const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

async function run() {
    return simulate({
        team1,
        team2,
        seed: [12345, 23456, 34567, 45678],
        agent1: new RandomAgent(createRandom(1001)),
        agent2: new RandomAgent(createRandom(2001))
    });
}

function normalize(result) {
    return {
        winner: result.winner,
        turns: result.turns,
        switchEvents: result.switchEvents,
        limited: result.limited,
        decisions: result.decisions,
        log: result.log
            .split('\n')
            .filter(line => !line.startsWith('|t:|'))
            .join('\n')
    };
}

async function main() {
    const first = await run();
    const second = await run();

    assert.deepEqual(
        normalize(first),
        normalize(second)
    );

    console.log('Winner:', first.winner);
    console.log('Turns:', first.turns);
    console.log('Decisions:', first.decisions.length);
    console.log('Battle result: MATCH');
    console.log('Decision history: MATCH');
    console.log('Battle log: MATCH');
    console.log('REPRODUCIBILITY TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
