const fs = require('node:fs');
const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const result = await simulate({
        team1,
        team2,
        agent1: new RandomAgent(),
        agent2: new RandomAgent()
    });

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/random_battle.log',
        result.log
    );

    fs.writeFileSync(
        'logs/random_battle.json',
        JSON.stringify(result, null, 2)
    );

    assert.ok(result.winner);
    assert.ok(result.turns > 0);
    assert.equal(
        result.decisions.filter(
            d => d.action.startsWith('team ')
        ).length,
        2
    );

    console.log('Winner:', result.winner);
    console.log('Turns:', result.turns);
    console.log('Switch events:', result.switchEvents);
    console.log('Decisions:', result.decisions.length);
    console.log('Turn limit reached:', result.limited);
    console.log('Selections:', result.decisions.filter(
        d => d.action.startsWith('team ')
    ));
    console.log('SIMULATOR TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
