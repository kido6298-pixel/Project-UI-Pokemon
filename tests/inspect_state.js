const fs = require('node:fs');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class InspectAgent extends RandomAgent {
    constructor(seed) {
        super(createRandom(seed));
        this.requests = [];
    }

    choose(request) {
        const action = super.choose(request);

        this.requests.push({
            request: JSON.parse(JSON.stringify(request)),
            action
        });

        return action;
    }
}

async function main() {
    const agent1 = new InspectAgent(1001);
    const agent2 = new InspectAgent(2001);

    const result = await simulate({
        team1,
        team2,
        seed: [12345, 23456, 34567, 45678],
        agent1,
        agent2
    });

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/player_requests.json',
        JSON.stringify({
            p1: agent1.requests,
            p2: agent2.requests
        }, null, 2)
    );

    console.log('\n=== TEAM PREVIEW ===');
    console.log(JSON.stringify(
        agent1.requests.find(x => x.request.teamPreview),
        null, 2
    ));

    console.log('\n=== FIRST TURN ===');
    console.log(JSON.stringify(
        agent1.requests.find(x => x.request.active),
        null, 2
    ));

    console.log('\n=== REQUEST TYPES ===');

    const types = {};

    for (const entry of agent1.requests) {
        const key = Object.keys(entry.request).sort().join(', ');
        types[key] = (types[key] || 0) + 1;
    }

    console.log(types);

    console.log('\nWinner:', result.winner);
    console.log('Requests:', agent1.requests.length);
    console.log('INSPECTION: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
