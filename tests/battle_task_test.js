const assert = require('node:assert/strict');

const {
    team1,
    team2
} = require('../src/realistic_test_teams');

const {
    createAgent
} = require('../src/agent_factory');

const {
    runBattleTask
} = require('../src/battle_task');

async function main() {
    const combinations = [
        ['random','random'],
        ['v04','random'],
        ['random','v05'],
        ['v05','v04'],
        ['v04','v05'],
        ['v05','v05']
    ];

    const originalTeams = structuredClone({
        team1,team2
    });

    const records = [];

    for (let i=0;i<combinations.length;i++) {
        const [type1,type2] = combinations[i];

        const task = {
            id:i+1,
            team1,
            team2,
            agent1:{
                type:type1,
                seed:3001+i
            },
            agent2:{
                type:type2,
                seed:4001+i
            },
            seed:[i+1,23456,34567,45678],
            includeHistory:true,
            includeLog:false
        };

        const result = await runBattleTask(task);

        assert.ok(
            ['AI-1','AI-2','DRAW']
                .includes(result.winner)
        );

        assert.equal(result.limited,false);

        for (const stats of Object.values(result.agents)) {
            assert.equal(stats.searchErrors,0);
            assert.equal(stats.inferenceErrors,0);
        }

        assert.ok(result.decisions.length > 0);

        records.push({
            Agent1:type1,
            Agent2:type2,
            Winner:result.winner,
            Turns:result.turns
        });

        console.log(
            type1 + ' vs ' + type2,
            result.winner,
            'Turns=' + result.turns
        );

        if (i === 3) {
            const repeated = await runBattleTask(task);

            assert.deepEqual(result,repeated);

            console.log(
                'Deterministic task equality: PASS'
            );

            const compact = await runBattleTask({
                ...task,
                includeHistory:false
            });

            const expected = {...result};

            delete expected.history;
            delete expected.decisions;

            assert.deepEqual(compact,expected);

            console.log(
                'Compact output equality: PASS'
            );
        }
    }

    assert.deepEqual(
        {team1,team2},
        originalTeams
    );

    assert.throws(() => createAgent({
        type:'unknown',
        side:'p1',
        seed:1
    }));

    await assert.rejects(
        runBattleTask({
            id:1,
            team1:[],
            team2:[]
        })
    );

    console.table(records);

    console.log(
        '\nGENERIC BATTLE TASK TEST: PASS'
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
