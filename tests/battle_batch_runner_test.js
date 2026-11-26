const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
    team1,team2
} = require('../src/realistic_test_teams');

const {
    runBattleBatch
} = require('../src/battle_batch_runner');

const {
    BattleResultStore
} = require('../src/battle_result_store');

const {
    runParallelTasks
} = require('../src/generic_parallel_simulator');

async function main() {
    const directory = fs.mkdtempSync(
        path.join(os.tmpdir(),'ui-battle-batch-')
    );

    const tasks = Array.from({length:12},(_,index) => {
        const i = index+1;

        return {
            id:1000+i,
            team1,
            team2,
            agent1:{
                type:'random',
                seed:3000+i
            },
            agent2:{
                type:'random',
                seed:4000+i
            },
            seed:[i,23456,34567,45678],
            includeHistory:true,
            includeLog:false
        };
    });

    const options = {
        tasks,
        directory,
        engineVersion:'step124-test',
        workers:4,
        chunkSize:4
    };

    try {
        const controller = new AbortController();

        const first = await runBattleBatch({
            ...options,
            signal:controller.signal,
            onProgress({completed}) {
                if (completed === 4) controller.abort();
            }
        });

        assert.equal(first.completed,4);
        assert.equal(first.interrupted,true);
        assert.equal(first.complete,false);

        console.log('Interruption: PASS');

        const resultPath = path.join(
            directory,'results.jsonl'
        );

        fs.appendFileSync(resultPath,'{"incomplete":');

        const second = await runBattleBatch(options);

        assert.equal(second.resumed,4);
        assert.equal(second.executed,8);
        assert.equal(second.completed,12);
        assert.equal(second.complete,true);
        assert.ok(second.recoveredBytes > 0);

        console.log('Resume: PASS');
        console.log('Partial record recovery: PASS');

        const third = await runBattleBatch(options);

        assert.equal(third.executed,0);
        assert.equal(third.resumed,12);

        console.log('Duplicate prevention: PASS');

        const records = fs.readFileSync(
            resultPath,'utf8'
        ).trim().split('\n').map(JSON.parse);

        assert.equal(records.length,12);

        const direct = await runParallelTasks({
            tasks,
            workers:4
        });

        const stored = records.map(r => r.result)
            .sort((a,b) => a.id-b.id);

        assert.deepEqual(stored,direct.results);

        console.log('Result equality: PASS');

        const changed = structuredClone(tasks);
        changed[0].agent1.seed++;

        await assert.rejects(
            runBattleBatch({
                ...options,
                tasks:changed
            }),
            /conditions mismatch/
        );

        await assert.rejects(
            runBattleBatch({
                ...options,
                engineVersion:'different-engine'
            }),
            /conditions mismatch/
        );

        console.log('Condition protection: PASS');

        const lock = new BattleResultStore(options);

        try {
            await assert.rejects(
                runBattleBatch(options),
                /EEXIST/
            );
        } finally {
            lock.close();
        }

        console.log('Concurrent access protection: PASS');

        fs.appendFileSync(resultPath,'invalid-json\n');

        await assert.rejects(
            runBattleBatch(options),
            SyntaxError
        );

        console.log('Corruption detection: PASS');

        const summary = {first,second,third};

        fs.mkdirSync('logs',{recursive:true});

        fs.writeFileSync(
            'logs/battle_batch_runner_test.json',
            JSON.stringify(summary,null,2)
        );

        console.log(JSON.stringify(summary,null,2));
        console.log('BATTLE BATCH RUNNER TEST: PASS');
    } finally {
        fs.rmSync(directory,{
            recursive:true,
            force:true
        });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});