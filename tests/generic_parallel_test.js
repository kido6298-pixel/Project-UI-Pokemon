const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
    team1,team2
} = require('../src/realistic_test_teams');

const {
    runParallelTasks
} = require('../src/generic_parallel_simulator');

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

    const tasks = Array.from(
        {length:24},
        (_,index) => {
            const i = index+1;

            const [type1,type2] =
                combinations[index%6];

            return {
                id:1000+i,
                team1:i%2 ? team1 : team2,
                team2:i%2 ? team2 : team1,
                agent1:{
                    type:type1,
                    seed:3000+i
                },
                agent2:{
                    type:type2,
                    seed:4000+i
                },
                seed:[i,23456,34567,45678],
                includeHistory:true,
                includeLog:false
            };
        }
    );

    const original = structuredClone(tasks);

    const runs = [];

    for (const workers of [1,8]) {
        console.log(
            '\n=== WORKERS: '+workers+' ==='
        );

        const run = await runParallelTasks({
            tasks,
            workers,
            onProgress({completed,count,result}) {
                console.log(
                    completed+'/'+count,
                    'ID='+result.id,
                    result.agents.p1.type,
                    'vs',
                    result.agents.p2.type,
                    result.winner,
                    'Turns='+result.turns
                );
            }
        });

        for (let i=0;i<tasks.length;i++) {
            const result = run.results[i];

            assert.equal(
                result.id,
                tasks[i].id
            );

            assert.equal(result.limited,false);

            for (
                const agent of
                Object.values(result.agents)
            ) {
                assert.equal(agent.searchErrors,0);
                assert.equal(agent.inferenceErrors,0);
            }
        }

        runs.push(run);
    }

    assert.deepEqual(
        runs[0].results,
        runs[1].results
    );

    console.log(
        '\nGeneric parallel equality: PASS'
    );

    const direct = await runBattleTask(tasks[3]);

    assert.deepEqual(
        direct,
        runs[1].results[3]
    );

    console.log(
        'Direct execution equality: PASS'
    );

    assert.deepEqual(tasks,original);

    console.log(
        'Input preservation: PASS'
    );

    await assert.rejects(
        runParallelTasks({
            tasks:[],
            workers:8
        })
    );

    await assert.rejects(
        runParallelTasks({
            tasks:[
                {...tasks[0],team1:[]}
            ],
            workers:1
        })
    );

    console.log(
        'Invalid task handling: PASS'
    );

    const summary = runs.map(run => ({
        Workers:run.workers,
        Battles:run.count,
        Seconds:run.seconds,
        BattlesPerSecond:run.battlesPerSecond,
        PeakRSSMB:run.peakRSSMB,
        Speedup:runs[0].seconds/run.seconds
    }));

    console.table(summary);

    fs.mkdirSync('logs',{recursive:true});

    fs.writeFileSync(
        'logs/generic_parallel_test.json',
        JSON.stringify({
            summary,
            results:runs[1].results
        },null,2)
    );

    console.log(
        '\nGENERIC PARALLEL TEST: PASS'
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
