const fs = require('node:fs');
const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class ObserverAgent extends RandomAgent {
    constructor(seed) {
        super(createRandom(seed));
        this.events = [];
    }

    observe(line) {
        this.events.push(line);
    }
}

async function main() {
    const agent1 = new ObserverAgent(1001);
    const agent2 = new ObserverAgent(2001);

    await simulate({
        team1,
        team2,
        seed: [12345, 23456, 34567, 45678],
        agent1,
        agent2
    });

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/player1_visible.log',
        agent1.events.join('\n')
    );

    fs.writeFileSync(
        'logs/player2_visible.log',
        agent2.events.join('\n')
    );

    for (const [name, agent] of [
        ['P1', agent1],
        ['P2', agent2]
    ]) {
        const preview = agent.events.filter(
            x => x.startsWith('|poke|')
        );

        assert.equal(preview.length, 12);

        console.log('\n=== ' + name + ' VISIBLE DATA ===');
        console.log(agent.events.filter(
            x => /^\|(poke|switch|move|-damage|-heal|-ability)\|/.test(x)
        ).slice(0, 30).join('\n'));

        console.log('Events:', agent.events.length);
    }

    console.log('\nOBSERVER TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
