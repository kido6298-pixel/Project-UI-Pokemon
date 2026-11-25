const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { BattleEvidence } = require('../src/battle_evidence');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class EvidenceAgent extends RandomAgent {
    constructor(side, random) {
        super(random);

        this.side = side;
        this.observer = new BattleEvidence(side);
        this.evidence = [];
    }

    observe(line) {
        this.observer.observe(line);

        this.evidence.push(
            ...this.observer.drain()
        );
    }
}

async function main() {
    const COUNT = 100;

    const stats = {
        battles: 0,
        turns: 0,
        damageEvents: 0,
        orderEvents: 0,
        battlesWithDamage: 0,
        battlesWithOrder: 0,
        limited: 0
    };

    const records = [];
    const started = performance.now();

    for (let i = 1; i <= COUNT; i++) {
        const agent1 = new EvidenceAgent(
            'p1', createRandom(1000 + i)
        );

        const agent2 = new EvidenceAgent(
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
        stats.turns += result.turns;

        if (result.limited) stats.limited++;

        let damageCount = 0;
        let orderCount = 0;

        for (const agent of [agent1, agent2]) {
            for (const event of agent.evidence) {
                assert.ok(event.turn >= 1);
                assert.ok(event.turn <= result.turns);

                if (event.type === 'damage') {
                    assert.ok(
                        event.defender.startsWith(
                            agent.side
                        )
                    );

                    assert.ok(
                        !event.attacker.startsWith(
                            agent.side
                        )
                    );

                    assert.ok(event.damage > 0);
                    assert.ok(event.afterHP > 0);

                    assert.equal(
                        event.beforeHP - event.afterHP,
                        event.damage
                    );

                    assert.ok(
                        event.beforeHP <= event.maxHP
                    );

                    damageCount++;
                }

                if (event.type === 'order') {
                    assert.ok(
                        event.own.startsWith(agent.side)
                    );

                    assert.ok(
                        !event.enemy.startsWith(agent.side)
                    );

                    assert.equal(
                        typeof event.ownFirst,
                        'boolean'
                    );

                    orderCount++;
                }
            }
        }

        stats.damageEvents += damageCount;
        stats.orderEvents += orderCount;

        if (damageCount > 0) {
            stats.battlesWithDamage++;
        }

        if (orderCount > 0) {
            stats.battlesWithOrder++;
        }

        records.push({
            battle: i,
            turns: result.turns,
            winner: result.winner,
            damageCount,
            orderCount,
            p1: agent1.evidence,
            p2: agent2.evidence
        });

        if (i % 25 === 0) {
            console.log(
                i + '/' + COUNT,
                'Damage=' + stats.damageEvents,
                'Order=' + stats.orderEvents
            );
        }
    }

    assert.equal(stats.battles, COUNT);
    assert.ok(stats.damageEvents > 0);
    assert.ok(stats.orderEvents > 0);
    assert.equal(stats.limited, 0);

    stats.damagePerBattle =
        stats.damageEvents / COUNT;

    stats.orderPerBattle =
        stats.orderEvents / COUNT;

    stats.seconds =
        (performance.now() - started) / 1000;

    fs.mkdirSync('logs', {recursive:true});

    fs.writeFileSync(
        'logs/live_battle_evidence.json',
        JSON.stringify({stats, records}, null, 2)
    );

    console.log('\n=== LIVE EVIDENCE SUMMARY ===');
    console.table(stats);

    console.log('\n=== FIRST BATTLE P1 EVIDENCE ===');
    console.table(records[0].p1);

    console.log('\n=== FIRST BATTLE P2 EVIDENCE ===');
    console.table(records[0].p2);

    console.log('\nLIVE BATTLE EVIDENCE TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
