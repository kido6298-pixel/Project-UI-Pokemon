const assert = require('node:assert/strict');
const fs = require('node:fs');

const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { LiveEnemyInference } = require('../src/live_enemy_inference');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

class InferenceAgent extends RandomAgent {
    constructor(side, random) {
        super(random);
        this.inference = new LiveEnemyInference(side);
    }

    observe(line) {
        this.inference.observe(line);
    }

    choose(request) {
        this.inference.updateRequest(request);
        return super.choose(request);
    }
}

async function main() {
    const stats = {
        battles: 0,
        damageAccepted: 0,
        dealtDamageAccepted: 0,
        orderAccepted: 0,
        duplicates: 0,
        skipped: 0,
        contradictions: 0,
        errors: 0,
        inferredPokemon: 0,
        highConfidence: 0,
        limited: 0
    };

    const records = [];
    const started = performance.now();

    for (let i = 1; i <= 100; i++) {
        const agent1 = new InferenceAgent(
            'p1', createRandom(1000 + i)
        );

        const agent2 = new InferenceAgent(
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
            const inference = agent.inference;

            for (const [key, value] of Object.entries(
                inference.stats
            )) {
                stats[key] = (stats[key] ?? 0) + value;
            }

            if (inference.lastError) {
                console.error(
                    'Inference error:',
                    inference.lastError
                );
            }

            for (const record of inference.snapshot()) {
                assert.ok(record.builds.length > 0);

                const sum = record.builds.reduce(
                    (total, b) => total + b.probability,
                    0
                );

                assert.ok(Math.abs(sum - 1) < 1e-9);

                stats.inferredPokemon++;

                const best = record.builds[0];

                if (best.probability >= 0.8) {
                    stats.highConfidence++;
                }

                records.push({
                    battle: i,
                    ...record
                });
            }
        }

        if (i % 25 === 0) {
            console.log(
                i + '/100',
                'Damage=' + stats.damageAccepted,
                'Dealt=' + stats.dealtDamageAccepted,
                'Order=' + stats.orderAccepted,
                'Contradictions=' + stats.contradictions,
                'Errors=' + stats.errors
            );
        }
    }

    stats.seconds =
        (performance.now() - started) / 1000;

    fs.mkdirSync('logs', {recursive:true});

    fs.writeFileSync(
        'logs/live_enemy_inference.json',
        JSON.stringify({stats, records}, null, 2)
    );

    console.log('\n=== LIVE ENEMY INFERENCE SUMMARY ===');
    console.table(stats);

    console.log('\n=== INFERENCE EXAMPLES ===');

    console.table(
        records.slice(0, 15).map(record => ({
            Battle: record.battle,
            Pokemon: record.observed.species,
            Evidence: record.evidenceCount,
            Contradictions: record.contradictions,
            BestBuild: record.builds[0].name,
            Probability: (
                record.builds[0].probability * 100
            ).toFixed(2) + '%'
        }))
    );

    assert.equal(stats.battles, 100);
    assert.equal(stats.errors, 0);
    assert.equal(stats.limited, 0);
    assert.ok(stats.damageAccepted > 0);
    assert.ok(stats.orderAccepted > 0);
    assert.ok(Number.isFinite(stats.dealtDamageAccepted));
    assert.ok(stats.dealtDamageAccepted > 0);

    console.log('\nLIVE ENEMY INFERENCE TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});

