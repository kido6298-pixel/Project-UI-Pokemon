const fs = require('node:fs');
const assert = require('node:assert/strict');
const { simulate } = require('../src/simulator');
const { StrategicAgentV02 } = require('../src/agents/strategic_agent_v02');
const { StrategicAgentV03 } = require('../src/agents/strategic_agent_v03');
const { createRandom } = require('../src/random');
const { team1, team2 } = require('../src/test_teams');

async function main() {
    const stats = {
        completed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        limited: 0,
        switchEvaluations: 0,
        voluntarySwitches: 0,
        forcedSwitches: 0,
        preventedSwitches: 0
    };

    const history = [];

    for (let i = 1; i <= 100; i++) {
        const side = i % 2 ? 'p1' : 'p2';

        const agent = new StrategicAgentV03(
            side,
            createRandom(1000 + i)
        );

        const opponent = new StrategicAgentV02(
            side === 'p1' ? 'p2' : 'p1',
            createRandom(2000 + i)
        );

        const result = await simulate({
            team1,
            team2,
            agent1: side === 'p1' ? agent : opponent,
            agent2: side === 'p2' ? agent : opponent,
            seed: [i, 23456, 34567, 45678]
        });

        stats.completed++;

        const winner = side === 'p1' ? 'AI-1' : 'AI-2';

        if (result.winner === winner) stats.wins++;
        else if (result.winner === 'DRAW') stats.draws++;
        else stats.losses++;

        if (result.limited) stats.limited++;

        for (const key of [
            'switchEvaluations',
            'voluntarySwitches',
            'forcedSwitches',
            'preventedSwitches'
        ]) {
            stats[key] += agent[key];
        }

        for (const entry of agent.switchHistory) {
            history.push({
                battle: i,
                side,
                ...entry
            });
        }
    }

    fs.mkdirSync('logs', {recursive: true});

    fs.writeFileSync(
        'logs/strategic_v03_test.json',
        JSON.stringify({stats, history}, null, 2)
    );

    console.log('\n=== STRATEGIC AI V0.3 ===');
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n=== VOLUNTARY SWITCH EXAMPLES ===');

    console.table(
        history.filter(h => h.type === 'voluntary')
            .slice(0, 10)
            .map(h => ({
                Battle: h.battle,
                Turn: h.turn,
                Pokemon: h.species,
                Attack: h.attackScore.toFixed(4),
                Switch: h.score.toFixed(4)
            }))
    );

    assert.equal(stats.completed, 100);
    assert.equal(stats.limited, 0);
    assert.ok(stats.switchEvaluations > 0);
    assert.ok(stats.voluntarySwitches > 0);
    assert.ok(stats.forcedSwitches > 0);

    console.log('STRATEGIC V0.3 TEST: PASS');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
