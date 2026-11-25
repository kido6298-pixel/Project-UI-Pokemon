const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { simulate } = require('../src/simulator');
const { RandomAgent } = require('../src/agents/random_agent');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const count = 1000;
    const started = performance.now();
    let completed = 0;
    let errors = 0;
    let limited = 0;

    fs.mkdirSync('logs/stress_errors', {recursive: true});

    for (let i = 1; i <= count; i++) {
        const seed = [i, 23456, 34567, 45678];
        const agentSeed1 = 1000 + i;
        const agentSeed2 = 2000 + i;

        try {
            const result = await simulate({
                team1,
                team2,
                seed,
                agent1: new RandomAgent(createRandom(agentSeed1)),
                agent2: new RandomAgent(createRandom(agentSeed2))
            });

            completed++;
            if (result.limited) limited++;

        } catch (error) {
            errors++;

            fs.writeFileSync(
                `logs/stress_errors/battle_${i}.json`,
                JSON.stringify({
                    battleId: i,
                    seed,
                    agentSeed1,
                    agentSeed2,
                    error: error.message,
                    stack: error.stack,
                    log: error.battleLog,
                    decisions: error.decisions
                }, null, 2)
            );

            console.error('FAILED BATTLE:', i);
            console.error(error.message);

            if (error.battleLog) {
                console.log('=== LAST BATTLE EVENTS ===');
                console.log(
                    error.battleLog.split('\n').slice(-30).join('\n')
                );
            }

            break;
        }

        if (i % 100 === 0) {
            console.log(`Progress: ${i}/${count}`);
        }
    }

    console.log('\n=== STRESS RESULT ===');
    console.log(JSON.stringify({
        requested: count,
        completed,
        errors,
        limited,
        elapsedSeconds: (performance.now() - started) / 1000
    }, null, 2));

    console.log(
        errors === 0 && completed === count
            ? 'STRESS TEST: PASS'
            : 'STRESS TEST: FAIL'
    );

    if (errors) process.exitCode = 1;
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
