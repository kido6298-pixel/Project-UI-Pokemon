const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { EvidenceContext } = require('../src/evidence_context');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class ContextAgent extends RandomAgent {
    constructor(side, random) {
        super(random);

        this.side = side;
        this.context = new EvidenceContext(side);
        this.events = [];
    }

    observe(line) {
        this.context.observe(line);
        this.events.push(...this.context.drain());
    }

    choose(request) {
        this.context.updateRequest(request);
        return super.choose(request);
    }
}

async function main() {
    const stats = {
        battles: 0,
        damageEvents: 0,
        orderEvents: 0,
        missingContexts: 0,
        limited: 0
    };

    const examples = [];

    const started = performance.now();

    for (let i = 1; i <= 100; i++) {
        const agent1 = new ContextAgent(
            'p1', createRandom(1000 + i)
        );

        const agent2 = new ContextAgent(
            'p2', createRandom(2000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1,
            agent2,
            seed: [i, 23456, 34567, 45678]
        });

        stats.battles++;

        if (result.limited) stats.limited++;

        for (const agent of [agent1, agent2]) {
            stats.missingContexts += agent.context.missing;

            for (const event of agent.events) {
                const context = event.context;

                assert.ok(context.own.species);
                assert.ok(context.enemy.species);
                assert.ok(context.own.curHP > 0);

                assert.ok(
                    context.ownIdent.startsWith(agent.side)
                );

                if (event.type === 'damage') {
                    stats.damageEvents++;

                    assert.equal(
                        context.own.curHP,
                        event.beforeHP
                    );

                    assert.equal(
                        context.ownIdent,
                        event.defender
                    );
                } else {
                    stats.orderEvents++;
                }

                if (examples.length < 20) {
                    examples.push(event);
                }
            }
        }

        if (i % 25 === 0) {
            console.log(
                i + '/100',
                'Damage=' + stats.damageEvents,
                'Order=' + stats.orderEvents,
                'Missing=' + stats.missingContexts
            );
        }
    }

    assert.equal(stats.battles, 100);
    assert.equal(stats.limited, 0);
    assert.ok(stats.damageEvents > 0);
    assert.ok(stats.orderEvents > 0);

    stats.seconds =
        (performance.now() - started) / 1000;

    fs.mkdirSync('logs', {recursive:true});

    fs.writeFileSync(
        'logs/evidence_context.json',
        JSON.stringify({stats, examples}, null, 2)
    );

    console.log('\n=== EVIDENCE CONTEXT SUMMARY ===');
    console.table(stats);

    console.log('\n=== FIRST CONTEXT EXAMPLE ===');
    console.log(JSON.stringify(examples[0], null, 2));

    console.log('\nEVIDENCE CONTEXT TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
